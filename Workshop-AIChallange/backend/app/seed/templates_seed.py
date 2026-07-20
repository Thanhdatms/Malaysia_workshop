"""Prompt Template Library — one starter template per question.

Facilitators can tune wording here between workshop runs; this is the single
source of truth re-seeded on a fresh database.
"""

TEMPLATES = [
    {
        "question_id": "q1",
        "title": "Marketing Launch Post Template",
        "template_text": (
            "Act as a B2B industrial marketing copywriter.\n\n"
            "Product: {{product_name}}\n"
            "Key features:\n{{feature_bullets}}\n"
            "Target audience: {{target_audience}}\n"
            "Tone: {{tone}}\n\n"
            "Write a LinkedIn launch post ({{word_count}} words) with:\n"
            "1. A short, attention-grabbing opening line\n"
            "2. The features translated into customer benefits\n"
            "3. A clear call to action\n\n"
            "Output format: ready-to-post LinkedIn text, no markdown headers."
        ),
    },
    {
        "question_id": "q2",
        "title": "Customer Complaint Reply Template",
        "template_text": (
            "Act as a senior account manager handling a valued but upset customer.\n\n"
            "Customer's complaint email:\n{{complaint_email}}\n"
            "Relationship context: {{relationship_context}}\n"
            "Known root cause (if any): {{root_cause}}\n"
            "What we can offer: {{compensation_or_goodwill}}\n\n"
            "Write a reply email that:\n"
            "1. Acknowledges the issue without making excuses\n"
            "2. Explains next steps concretely\n"
            "3. Reaffirms the relationship and next follow-up date\n\n"
            "Output format: a complete email, professional but warm tone."
        ),
    },
    {
        "question_id": "q3",
        "title": "(Not applicable — this task should not be delegated to AI)",
        "template_text": (
            "This question is intentionally about recognizing the LIMITS of AI.\n\n"
            "Instead of a prompt, write a short justification covering:\n"
            "1. What legal/labor-law risk exists in letting an algorithm decide?\n"
            "2. What context or empathy would be lost?\n"
            "3. Who should be accountable for this decision, and why does that "
            "rule out full automation?\n\n"
            "AI can still help you ORGANIZE the facts of the case (e.g. summarize "
            "the timeline) — but the final decision and its justification must be "
            "made by a human."
        ),
    },
    {
        "question_id": "q4",
        "title": "Inventory Reorder Priority Template",
        "template_text": (
            "Act as an inventory planning analyst.\n\n"
            "Here is our current stock data (columns: SKU, Product Name, Category, "
            "Warehouse, Current Stock, Reorder Point, Avg Monthly Usage, Lead Time "
            "days, Unit Cost):\n{{paste_inventory_rows}}\n\n"
            "Do the following:\n"
            "1. Flag every SKU currently at or below its reorder point\n"
            "2. For each flagged SKU, suggest an order quantity that covers lead "
            "time + 1 month of buffer usage\n"
            "3. Assign a stockout-risk rating (High / Medium / Low) based on how "
            "far below reorder point they are and their lead time\n\n"
            "Output format: a markdown table sorted by risk, High risk first."
        ),
    },
    {
        "question_id": "q5",
        "title": "Contract Risk Extraction Template",
        "template_text": (
            "Act as a finance analyst reviewing a supplier contract before renewal.\n\n"
            "Contract text / key sections:\n{{paste_contract_text}}\n\n"
            "Extract and summarize:\n"
            "1. Payment terms (due dates, discounts)\n"
            "2. Late-delivery penalty clause\n"
            "3. Termination clause\n"
            "4. Currency / FX adjustment clause\n\n"
            "Then list 2-3 negotiation points we should raise before renewing, "
            "ranked by financial risk.\n\n"
            "Output format: short risk brief with headers, suitable to forward to "
            "a finance manager."
        ),
    },
    {
        "question_id": "q6",
        "title": "Customer Win-Back Campaign Template",
        "template_text": (
            "Act as a sales & marketing strategist.\n\n"
            "Customer order history (last 6 months, per customer):\n"
            "{{paste_customer_sales_rows}}\n\n"
            "Market/competitor context:\n{{paste_market_report_summary}}\n\n"
            "Do the following:\n"
            "1. Identify the top 5 customers with the clearest declining order "
            "trend, and briefly say why each looks at-risk\n"
            "2. For each of the 5, draft a short win-back email personalized to "
            "their product category, referencing relevant market conditions to "
            "make the offer credible\n"
            "3. Suggest one promotion angle per customer (e.g. discount, bundling, "
            "priority lead time)\n\n"
            "Output format: one section per customer, with the email drafted in "
            "full."
        ),
    },
]
