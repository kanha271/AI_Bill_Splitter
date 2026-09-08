from app.splitter import split_bill


items = [
    {
        "name": "Biryani",
        "quantity": 2,
        "unit_price": 250,
        "total_price": 500
    },
    {
        "name": "Coke",
        "quantity": 1,
        "unit_price": 100,
        "total_price": 100
    },
    {
        "name": "Paneer",
        "quantity": 1,
        "unit_price": 300,
        "total_price": 300
    }
]


people = [
    "Karam",
    "Rahul",
    "Aman"
]


assignments = {

    "Biryani": {
        "Karam": 1,
        "Rahul": 1
    },

    "Coke": {
        "Rahul": 1
    },

    "Paneer": {
        "Karam": 0.5,
        "Rahul": 0.25,
        "Aman": 0.25
    }
}


result = split_bill(
    items=items,
    people=people,
    assignments=assignments,
    discount=0,
    tax=90,
    service_charge=0
)


for person, details in result.items():

    print(f"\n{person}")
    print("-" * 30)

    print(
        f"Subtotal:        "
        f"₹{details['subtotal']:.2f}"
    )

    print(
        f"Discount:        "
        f"₹{details['discount']:.2f}"
    )

    print(
        f"GST:             "
        f"₹{details['tax']:.2f}"
    )

    print(
        f"Service Charge:  "
        f"₹{details['service_charge']:.2f}"
    )

    print(
        f"Final Total:     "
        f"₹{details['total']:.2f}"
    )