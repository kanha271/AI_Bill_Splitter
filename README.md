# AI Bill Splitter

> **Photo → Structured Bill → Human Review → Fair Individual Split**

AI Bill Splitter is an AI-powered web application that converts a photograph of a restaurant bill into structured bill data, lets the user review and correct the extracted information, and then calculates a fair individual split based on what each person actually consumed.

The project combines **vision-based AI extraction**, **Pydantic validation**, **human-in-the-loop verification**, and a **deterministic financial splitting engine**.

## Live Demo

**Web Application:**  
https://ai-bill-splitter-x6fw.onrender.com

**GitHub Repository:**  
https://github.com/kanha271/AI_Bill_Splitter

---

## Table of Contents

- [Problem](#problem)
- [Solution](#solution)
- [Key Features](#key-features)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Bill Extraction](#bill-extraction)
- [Human-in-the-Loop Review](#human-in-the-loop-review)
- [Fair Splitting Methodology](#fair-splitting-methodology)
- [Tax, Service Charge and Discount Allocation](#tax-service-charge-and-discount-allocation)
- [Total Verification](#total-verification)
- [Data Models](#data-models)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Local Setup](#local-setup)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)
- [Limitations](#limitations)
- [Future Improvements](#future-improvements)
- [Project Context](#project-context)
- [License](#license)

---

## Problem

Splitting a restaurant bill becomes surprisingly difficult when:

- Several people share the same item.
- Different people consume different quantities of an item.
- Taxes must be distributed fairly.
- A service charge needs to be allocated.
- Discounts need to be accounted for.
- The bill photograph is difficult to read.
- AI extraction can make mistakes.
- The printed total can itself contain an arithmetic error.

A simple approach such as:

```text
Total Bill ÷ Number of People
```

does not represent what each person actually consumed.

For example, if six rotis cost ₹144 and three people consumed:

```text
Person A → 2 rotis
Person B → 3 rotis
Person C → 1 roti
```

an equal split would be unfair.

AI Bill Splitter solves this by using **actual consumed quantities** as the basis for item allocation.

---

# Solution

The application follows a two-stage design:

### Stage 1 — AI-assisted extraction

The bill photograph is sent to a vision-capable AI model, which extracts structured information such as:

- Item name
- Quantity
- Unit price
- Item total
- Subtotal
- Discount
- Tax
- Service charge
- Printed total

The AI output is validated using Pydantic before it reaches the splitting engine.

### Stage 2 — Deterministic financial calculation

After the user reviews the extracted information, the application:

1. Records the people sharing the bill.
2. Records how much of each item each person consumed.
3. Allocates item amounts proportionally.
4. Allocates discounts, taxes and service charges proportionally.
5. Handles currency rounding.
6. Produces an individual total for every person.
7. Compares the calculated bill total with the printed total.

The AI is therefore used for **document understanding**, while the actual money calculation is handled by deterministic Python code.

---

# Key Features

## 1. Photo-Based Bill Extraction

Upload a photograph of a restaurant bill instead of manually entering every item.

The application extracts structured information from the image using a vision-capable AI model.

---

## 2. Vision AI + Structured JSON

The extraction pipeline is:

```text
Bill Photograph
       ↓
Groq Vision Model
       ↓
Structured JSON
       ↓
Pydantic Validation
       ↓
Human Review
```

The current vision model is:

```text
qwen/qwen3.6-27b
```

through the Groq API.

---

## 3. Pydantic Validation

AI-generated data is not directly trusted by the financial calculation layer.

Pydantic validates the extracted schema and individual item values.

An item contains:

```text
name
quantity
unit_price
total_price
name_confidence
quantity_confidence
price_confidence
```

The bill contains:

```text
items
subtotal
discount
tax
service_charge
total
```

Item-level validation also checks that:

```text
quantity × unit_price ≈ total_price
```

within a small currency rounding tolerance.

---

## 4. Human-in-the-Loop Review

The user gets an opportunity to inspect and correct AI extraction before any bill splitting occurs.

The review interface allows editing:

- Item name
- Quantity
- Unit price
- Item total
- Extracted bill values

Each item also exposes confidence values for:

- Name
- Quantity
- Price

This is important because financial calculations should not blindly depend on an uncertain AI extraction.

---

## 5. Quantity-Based Assignment

The application uses **consumed quantities**, rather than asking users to estimate percentages.

Example:

```text
Tandoori Roti × 6

Karam  → 2
Rahul  → 3
Aman   → 1
```

The application verifies:

```text
2 + 3 + 1 = 6
```

before calculating the allocation.

The same approach supports fractional quantities.

For example:

```text
Pizza × 1

Karam  → 0.50
Rahul  → 0.50
```

---

## 6. Fair Shared-Item Splitting

For an item:

```text
Item total = P
Original quantity = Q
Person's consumed quantity = q
```

the person's share is:

```text
Person Share = P × (q / Q)
```

### Example

```text
Tandoori Roti × 6
Total = ₹144
```

Consumption:

```text
Karam  → 2
Rahul  → 3
Aman   → 1
```

Allocation:

```text
Karam  → ₹48
Rahul  → ₹72
Aman   → ₹24
```

Total:

```text
₹48 + ₹72 + ₹24 = ₹144
```

---

## 7. Proportional Tax Allocation

Tax is not divided equally between people.

Instead, tax is distributed according to each person's share of the consumed items.

For example:

```text
Person A subtotal = ₹300
Person B subtotal = ₹500

Total subtotal = ₹800
Tax = ₹80
```

Then:

```text
Person A tax = ₹80 × (₹300 / ₹800)
             = ₹30

Person B tax = ₹80 × (₹500 / ₹800)
             = ₹50
```

Therefore:

```text
₹30 + ₹50 = ₹80
```

This keeps the tax allocation proportional to actual consumption.

---

## 8. Proportional Service Charge

Service charges are handled using the same proportional allocation principle.

A person who contributes more to the consumed subtotal receives a correspondingly larger share of the service charge.

---

## 9. Proportional Discount Allocation

Discounts are also distributed according to each person's share of the consumed subtotal.

This prevents the discount from being assigned equally when people have consumed different amounts.

---

## 10. Currency-Safe Rounding

Financial calculations use Python's `Decimal` type and explicit rounding rather than relying only on binary floating-point arithmetic.

When a value cannot be divided into equal cents, the rounding remainder is assigned so that the final allocated amount remains consistent.

For example:

```text
₹1 ÷ 3

Person A → ₹0.34
Person B → ₹0.33
Person C → ₹0.33

Total → ₹1.00
```

---

## 11. Printed Total Verification

The application distinguishes between:

```text
Calculated bill total
```

and:

```text
Printed total on the receipt
```

This is important because a receipt can contain an arithmetic discrepancy.

For example:

```text
Subtotal       ₹771.00
SGST             ₹19.27
CGST             ₹19.27
----------------------
Calculated     ₹809.54

Printed Total  ₹810.00

Difference       ₹0.46
```

The system does not silently replace the printed value or reject the entire bill. Instead, the discrepancy is surfaced so that a human can review it.

---

# How It Works

The complete workflow is:

```text
┌─────────────────────┐
│   Upload Bill Photo │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Groq Vision AI   │
│  Extract Bill Data  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Pydantic Schema   │
│      Validation     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│    Human Review     │
│  Correct AI Output  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│     Add People      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Assign Consumed     │
│ Quantities per Item │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Deterministic Split │
│       Engine        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Individual Results  │
│ + Total Verification│
└─────────────────────┘
```

---

# Architecture

```text
                         ┌──────────────────────┐
                         │        User          │
                         │   Restaurant Bill    │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │       Frontend       │
                         │ HTML / CSS / JS      │
                         └──────────┬───────────┘
                                    │ HTTP
                                    ▼
                         ┌──────────────────────┐
                         │       FastAPI        │
                         │       Backend        │
                         └───────┬───────┬──────┘
                                 │       │
                       Extraction│       │Splitting
                                 │       │
                                 ▼       ▼
                    ┌────────────────┐  ┌─────────────────┐
                    │   Groq Vision  │  │ Deterministic   │
                    │       AI       │  │ Splitter Engine │
                    └───────┬────────┘  └────────┬────────┘
                            │                    │
                            ▼                    │
                    ┌────────────────┐           │
                    │    Pydantic    │           │
                    │    Models      │           │
                    └───────┬────────┘           │
                            │                    │
                            └─────────┬──────────┘
                                      ▼
                             ┌──────────────────┐
                             │ Individual Bill  │
                             │     Results      │
                             └──────────────────┘
```

---

# Bill Extraction

The extraction layer is implemented in:

```text
app/extractor.py
```

The model receives the bill image and is instructed to return a consistent JSON structure containing:

```json
{
  "items": [
    {
      "name": "Tandoori Roti",
      "quantity": 6,
      "unit_price": 24,
      "total_price": 144,
      "name_confidence": 0.98,
      "quantity_confidence": 0.99,
      "price_confidence": 0.99
    }
  ],
  "subtotal": 771,
  "discount": 0,
  "tax": 38.54,
  "service_charge": 0,
  "total": 810
}
```

The actual extracted values depend on the uploaded bill.

Multiple tax lines, such as CGST and SGST, are combined into the bill's `tax` field.

---

# Human-in-the-Loop Review

The project intentionally places human review between extraction and calculation:

```text
AI Extraction
     ↓
Confidence + Structured Fields
     ↓
Human Review
     ↓
Corrected Bill
     ↓
Financial Calculation
```

This design reduces the risk of an extraction mistake directly becoming a financial mistake.

The user can modify the extracted item information before assigning quantities.

---

# Fair Splitting Methodology

The splitting engine is implemented in:

```text
app/splitter.py
```

For each item:

```text
item_share = item_total × consumed_quantity / item_quantity
```

For example:

```text
Item total = ₹389
Quantity = 1

Karam consumes 1
Rahul consumes 0

Karam → ₹389
Rahul → ₹0
```

For a shared quantity:

```text
Item total = ₹100
Quantity = 4

Karam consumes 1
Rahul consumes 3
```

The allocation becomes:

```text
Karam → ₹25
Rahul → ₹75
```

The engine also verifies that the assigned quantities add up to the original item quantity.

---

# Tax, Service Charge and Discount Allocation

After item amounts are allocated, the person's item subtotal is calculated.

Let:

```text
Person subtotal = S
Total consumed subtotal = T
```

For any bill-level adjustment `A`:

```text
Person adjustment = A × (S / T)
```

This is applied to:

- Tax
- Service charge
- Discount

The result is that adjustments follow actual consumption rather than being divided equally.

---

# Total Verification

The application keeps two concepts separate:

### Printed total

The value physically printed on the bill.

### Calculated total

The amount obtained from the structured bill fields.

This allows the application to identify discrepancies.

For example:

```text
Calculated total = ₹809.54
Printed total    = ₹810.00
Difference       = ₹0.46
```

A discrepancy is presented to the user instead of being hidden.

---

# Data Models

The main Pydantic models are defined in:

```text
app/models.py
```

## `BillItem`

```text
name: str
quantity: float
unit_price: float
total_price: float

name_confidence: float
quantity_confidence: float
price_confidence: float
```

Constraints include:

- Quantity must be greater than zero.
- Unit price cannot be negative.
- Total price cannot be negative.
- Confidence values must be between `0` and `1`.
- Item total is checked against quantity × unit price within a small rounding tolerance.

## `Bill`

```text
items
subtotal
discount
tax
service_charge
total
```

The bill-level printed total is not rejected merely because it differs from the calculated components. This allows the application to surface a potentially incorrect printed total for human review.

---

# Technology Stack

## Backend

- Python
- FastAPI
- Uvicorn
- Pydantic v2

## AI / Vision

- Groq API
- `qwen/qwen3.6-27b`
- Vision-capable image input
- JSON mode

## Frontend

- HTML5
- CSS3
- Vanilla JavaScript

## Financial Calculation

- Python `Decimal`
- Deterministic proportional allocation
- Explicit currency rounding

## Deployment

- GitHub
- Render

---

# Project Structure

```text
AI_Bill_Splitter/
│
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   ├── extractor.py
│   ├── splitter.py
│   │
│   └── static/
│       ├── index.html
│       ├── style.css
│       └── script.js
│
├── uploads/
│   └── runtime temporary files
│
├── test_splitter.py
├── requirements.txt
├── .gitignore
└── README.md
```

`uploads/` is ignored by Git and is not required as persistent application storage. Bill images are processed using temporary files so the deployed application does not depend on persistent local storage.

---

# API Endpoints

## `GET /`

Serves the frontend application.

---

## `GET /health`

Returns the service health status.

Example:

```json
{
  "status": "ok",
  "service": "AI Bill Splitter"
}
```

---

## `POST /upload`

Accepts a bill image as multipart form data.

This endpoint is available for upload handling.

---

## `POST /extract`

Accepts a bill image and sends it to the AI extraction layer.

Successful response:

```json
{
  "success": true,
  "bill": {
    "items": [],
    "subtotal": 0,
    "discount": 0,
    "tax": 0,
    "service_charge": 0,
    "total": 0
  },
  "message": "Bill extracted successfully"
}
```

If extraction fails, the endpoint returns:

```json
{
  "success": false,
  "bill": null,
  "message": "..."
}
```

---

## `POST /split`

Accepts a validated bill, people, and quantity assignments.

Conceptually:

```json
{
  "bill": {
    "items": [],
    "subtotal": 0,
    "discount": 0,
    "tax": 0,
    "service_charge": 0,
    "total": 0
  },
  "people": [
    "Karam",
    "Rahul"
  ],
  "assignments": {
    "Tandoori Roti": {
      "Karam": 2,
      "Rahul": 1
    }
  }
}
```

The endpoint returns individual item allocations and each person's:

- Subtotal
- Discount
- Tax
- Service charge
- Final total

It also returns bill-level verification information.

---

# Local Setup

## Prerequisites

Install:

- Python 3.10+
- Git
- A Groq API key

---

## 1. Clone the repository

```bash
git clone https://github.com/kanha271/AI_Bill_Splitter.git
cd AI_Bill_Splitter
```

---

## 2. Create a virtual environment

### Windows

```powershell
python -m venv venv
venv\Scripts\activate
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Configure environment variables

Create a `.env` file in the project root:

```env
GROQ_API_KEY=your_groq_api_key
```

Do not commit `.env` to Git.

---

## 5. Start the server

```bash
uvicorn app.main:app --reload
```

The application will be available at:

```text
http://127.0.0.1:8000
```

Health check:

```text
http://127.0.0.1:8000/health
```

---

# Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Yes | API key used for AI bill extraction |

The API key should be stored as an environment variable rather than hard-coded in source code.

---

# Testing

## Splitter Testing

The repository contains:

```text
test_splitter.py
```

This tests the deterministic splitting logic independently of the vision model.

This separation is useful because financial calculation should be testable without making an external AI request.

---

## Manual Application Testing

A typical manual test is:

```text
1. Open application
2. Upload bill
3. Extract bill
4. Review extracted fields
5. Correct fields if required
6. Add people
7. Assign consumed quantities
8. Split bill
9. Verify individual totals
10. Verify calculated vs printed total
```

---

# Example: Incorrect Printed Total

One of the test bills contains a deliberately incorrect printed total.

The bill components are:

```text
Subtotal       ₹771.00
SGST             ₹19.27
CGST             ₹19.27
-----------------------
Calculated      ₹809.54

Printed Total   ₹810.00
Difference        ₹0.46
```

The important behavior is that the application should **not treat the printed total as unquestionable truth**.

Instead:

```text
Printed total
      +
Structured components
      ↓
Verification
      ↓
Human review if discrepancy exists
```

This keeps extraction, validation, and financial verification as separate concerns.

---

# Design Decisions

## Why use a vision model?

Restaurant receipts can vary considerably in:

- Layout
- Font
- Image quality
- Alignment
- Languages
- Lighting
- Paper condition

A vision model provides a flexible extraction layer without requiring a separate fixed template for every restaurant.

---

## Why use Pydantic?

The AI produces structured data, but AI output should still be validated before it reaches financial logic.

Pydantic acts as the schema boundary:

```text
AI output
   ↓
Pydantic
   ↓
Validated Python model
   ↓
Financial logic
```

---

## Why human review?

Even a strong vision model can misread:

- Quantities
- Decimal points
- Item names
- Prices
- Totals

Because the application deals with money, the user gets the opportunity to correct extracted data before splitting.

---

## Why not let the AI calculate the final bill?

The model is used for **understanding the document**, not for performing the final financial calculation.

Once the data is validated, deterministic Python code handles:

- Proportional item allocation
- Tax allocation
- Service charge allocation
- Discount allocation
- Currency rounding
- Verification

This makes the calculation reproducible and easier to test.

---

## Why quantities instead of percentages?

Users can more naturally specify:

```text
2 rotis
1 pizza
0.5 pizza
3 drinks
```

than:

```text
33.33%
50%
```

Quantity-based assignment also maps directly to the original bill quantity and makes it possible to validate that all units have been assigned.

---

# Deployment

The application is deployed on **Render** as a FastAPI web service.

## Build Command

```bash
pip install -r requirements.txt
```

## Start Command

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Environment Variable

Configure:

```text
GROQ_API_KEY
```

The deployed application is available at:

https://ai-bill-splitter-x6fw.onrender.com

---

# Security and Privacy

- API credentials are stored in environment variables.
- `.env` is excluded from Git.
- Uploaded bill images are handled through temporary files during extraction.
- The application does not require a database for its core workflow.
- Public test bills should be redacted before being committed to the repository.

---

# Limitations

The current implementation has several practical limitations:

1. Extraction accuracy depends on the quality and readability of the uploaded image.
2. Very poor handwriting or severely damaged receipts may still be difficult for the vision model to interpret.
3. AI extraction consumes an external API and therefore depends on API availability and quota.
4. The current interface expects the user to review extracted information before splitting.
5. The core workflow processes a bill image at a time; long multi-photo bills require the images to be handled as a combined test/workflow case rather than assuming automatic document stitching.
6. The application currently focuses on restaurant-style bill splitting rather than arbitrary financial documents.

---

# Future Improvements

Potential extensions include:

- Multi-image bill stitching for long receipts.
- Automatic image preprocessing and perspective correction.
- OCR + vision-model ensemble extraction.
- More granular confidence-based review highlighting.
- Currency and locale detection.
- User accounts and saved bills.
- Persistent bill history.
- Receipt item category detection.
- Automatic duplicate-item grouping.
- Better support for handwritten bills.
- Automated robustness evaluation across the complete test set.
- Additional unit and integration tests.
- More sophisticated reconciliation of subtotal, tax, discount and total fields.

---

# Project Context

This project was developed as an AI application for the challenge:

> **Split the bill from a photograph**

The core design focuses on:

```text
Vision AI
    +
Structured Extraction
    +
Schema Validation
    +
Human Review
    +
Deterministic Financial Logic
```

The goal is not simply to read a receipt, but to create a complete pipeline from an unstructured bill photograph to a transparent and fair individual payment calculation.

---

# Screenshots

## Application Interface

### Bill Upload

![Bill Upload](image-1.png)
![Original bill](1.jpeg)

---

### AI Extraction & Human Review

The extracted bill information is displayed for review. Item names, quantities, prices, totals, and confidence values can be inspected and corrected before proceeding.

![AI Extraction and Human Review](image-2.png)
![continue](image-3.png)

---


### Bill Split Results

The application calculates each person's item subtotal, discount, tax, service charge, and final amount.

![Split Results](image-6.png)

---


# Demo

A recommended demonstration flow is:

```text
1. Open the deployed application
2. Upload a restaurant bill
3. Show AI-extracted items
4. Show confidence values
5. Correct an extracted field if necessary
6. Add three people
7. Assign quantities to each person
8. Run the split
9. Show individual totals
10. Show proportional tax/service-charge allocation
11. Demonstrate printed-total discrepancy detection
```

**Demo Video:** Add the final demo video link here.

---

# License

This project is intended as an educational and demonstration project.

Add an appropriate open-source license file if the project is intended to be distributed or reused publicly.
