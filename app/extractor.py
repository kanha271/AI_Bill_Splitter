import base64
import json
import os

from dotenv import load_dotenv
from groq import Groq

from .models import Bill


load_dotenv()

API_KEY = os.getenv("GROQ_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not configured."
    )

client = Groq(api_key=API_KEY)


EXTRACTION_PROMPT = """
You are an expert restaurant receipt extraction system.

Analyze the provided restaurant bill image and return ONE JSON OBJECT.

IMPORTANT:
You MUST return ALL of these top-level keys:

{
  "items": [],
  "subtotal": 0,
  "discount": 0,
  "tax": 0,
  "service_charge": 0,
  "total": 0
}

The top-level object MUST contain exactly these six keys.

For every visible food or beverage line item, return:

{
  "name": string,
  "quantity": number,
  "unit_price": number,
  "total_price": number,
  "name_confidence": number,
  "quantity_confidence": number,
  "price_confidence": number
}

Rules:

1. Read values directly from the image.
2. Extract EVERY visible food/beverage line item.
3. Do NOT invent information.
4. Do NOT estimate unreadable values.
5. Preserve item names as they appear on the bill.
6. Confidence values must be between 0 and 1.
7. If discount is clearly absent, return 0.
8. If tax is clearly absent, return 0.
9. If service charge is clearly absent, return 0.
10. quantity × unit_price should normally equal total_price.
11. If the printed bill total is inconsistent with the other
    values, still return the PRINTED total in "total".
12. "subtotal" means the printed subtotal/sub-total/food subtotal.
13. "tax" means the TOTAL tax amount. If there are multiple
    tax lines such as CGST and SGST, ADD them together.
14. "service_charge" means the total service charge.
15. "discount" means the total discount.
16. "total" means the final printed/payable total.
17. Never omit any top-level key.
18. Return ONLY valid JSON. No markdown. No explanation.

Inspect the ENTIRE image, especially the bottom section containing
subtotal, taxes, service charges, discounts and final total.
"""

async def extract_bill(image_path: str) -> Bill:

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    extension = os.path.splitext(image_path)[1].lower()

    mime_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".heic": "image/heic",
        ".heif": "image/heif",
    }

    mime_type = mime_types.get(
        extension,
        "image/jpeg"
    )

    image_base64 = base64.b64encode(
        image_bytes
    ).decode("utf-8")

    completion = client.chat.completions.create(
        model="qwen/qwen3.6-27b",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": EXTRACTION_PROMPT
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": (
                                f"data:{mime_type};"
                                f"base64,{image_base64}"
                            )
                        }
                    }
                ]
            }
        ],
        # Qwen 3.6 27B supports JSON mode with vision.
        response_format={
            "type": "json_object"
        },
        temperature=0,
        max_completion_tokens=4096,
        reasoning_effort="none"
    )

    raw_output = (
        completion.choices[0].message.content
    )

    if not raw_output:
        raise ValueError(
            "Groq returned an empty response."
        )

    try:
        data = json.loads(raw_output)
    except json.JSONDecodeError as e:
        raise ValueError(
            f"Groq returned invalid JSON: {e}"
        )

    required_fields = [
        "items",
        "subtotal",
        "discount",
        "tax",
        "service_charge",
        "total"
    ]

    missing = [
        field
        for field in required_fields
        if field not in data
    ]

    if missing:
        raise ValueError(
            "Groq extraction was incomplete. Missing fields: "
            + ", ".join(missing)
            + ". Please retry the extraction."
        )

    if not isinstance(data["items"], list):
        raise ValueError(
            "Groq returned an invalid items list."
        )

    for field in [
        "subtotal",
        "discount",
        "tax",
        "service_charge",
        "total"
    ]:
        if data[field] is None:
            data[field] = 0

    return Bill.model_validate(data)
