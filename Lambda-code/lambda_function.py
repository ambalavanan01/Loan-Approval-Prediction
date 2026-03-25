import json
import boto3
from datetime import datetime

# Initialize clients
runtime = boto3.client("sagemaker-runtime")
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("LoanHistory")

# SES client
ses = boto3.client("ses", region_name="eu-north-1")

# Your endpoint
ENDPOINT_NAME = "linear-learner-2026-03-25-02-53-26-050"


# -------- Email Function --------
def send_email(customer_email, customer_name, phone, loan_amount, status):

    subject = "Loan Application Status"

    body = f"""
Dear {customer_name},

Thank you for applying for a loan with our service.

Here are the details of your application:

Customer Name : {customer_name}
Phone Number  : {phone}
Loan Amount   : ₹{loan_amount}000
Loan Status   : {status}

our team will contact you shortly for the next steps.

Regards,
Loan Prediction System
"""

    ses.send_email(
        Source="ambalavanan275@gmail.com",
        Destination={
            "ToAddresses": [customer_email]
        },
        Message={
            "Subject": {"Data": subject},
            "Body": {
                "Text": {"Data": body}
            }
        }
    )


def lambda_handler(event, context):
    try:
        # Detect Method
        method = event.get('httpMethod')
        if not method:
            method = event.get('requestContext', {}).get('http', {}).get('method', 'POST')

        # -------- GET: Fetch History --------
        if method == 'GET':
            response = table.scan()
            items = response.get('Items', [])
            items.sort(key=lambda x: str(x.get('Timestamp', '')), reverse=True)

            return {
                "statusCode": 200,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps(items)
            }

        # -------- POST: Predict and Save --------
        body_str = event.get("body", "{}")

        if isinstance(body_str, str):
            body = json.loads(body_str)
        else:
            body = body_str

        features = body.get("features", [])
        metadata = body.get("metadata", {})

        # Prediction logic
        payload = ",".join(str(x) for x in features)

        response = runtime.invoke_endpoint(
            EndpointName=ENDPOINT_NAME,
            ContentType="text/csv",
            Body=payload
        )

        result_raw = response["Body"].read().decode()
        result_json = json.loads(result_raw)

        prediction_score = result_json["predictions"][0]["score"]
        final_status = "Approved" if prediction_score >= 0.5 else "Rejected"

        # Save Item with Customer Metadata
        try:
            table.put_item(
                Item={
                    'UserEmail': 'ambalavanan275@gmail.com',
                    'Timestamp': datetime.utcnow().isoformat(),
                    'CustomerName': metadata.get('name', 'N/A'),
                    'CustomerEmail': metadata.get('email', 'N/A'),
                    'CustomerPhone': metadata.get('phone', 'N/A'),
                    'LoanAmount': str(features[6]),
                    'Prediction': final_status,
                    'Probability': str(prediction_score)
                }
            )

            # -------- Send Email --------
            try:
                send_email(
                    metadata.get('email', 'N/A'),
                    metadata.get('name', 'Customer'),
                    metadata.get('phone', 'N/A'),
                    features[6],
                    final_status
                )
            except Exception as mail_err:
                print(f"Email Error: {mail_err}")

        except Exception as db_err:
            print(f"DB Error: {db_err}")

        return {
            "statusCode": 200,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({
                "prediction": final_status,
                "probability": prediction_score
            })
        }

    except Exception as e:
        print(f"Global Error: {e}")

        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": str(e)})
        }