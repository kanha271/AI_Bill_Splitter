from decimal import Decimal, ROUND_HALF_UP


CENT = Decimal("0.01")


def money(value):
    return Decimal(str(value)).quantize(
        CENT,
        rounding=ROUND_HALF_UP
    )


def split_bill(
    items,
    people,
    assignments,
    discount=0,
    tax=0,
    service_charge=0
):
    if not people:
        raise ValueError("At least one person is required.")

    person_subtotals = {
        person: Decimal("0.00")
        for person in people
    }

    person_items = {
        person: []
        for person in people
    }

    # -----------------------------------
    # Split individual items
    # -----------------------------------

    for item in items:
        name = item["name"]
        quantity = Decimal(str(item["quantity"]))
        total_price = money(item["total_price"])

        if name not in assignments:
            raise ValueError(
                f"No assignment found for item: {name}"
            )

        item_assignments = assignments[name]

        assigned_quantity = sum(
            Decimal(str(qty))
            for qty in item_assignments.values()
        )

        if abs(assigned_quantity - quantity) > Decimal("0.01"):
            raise ValueError(
                f"Assignment for '{name}' must total "
                f"{quantity} units. Got {assigned_quantity}."
            )

        remaining_amount = total_price
        consumers = list(item_assignments.items())

        for index, (person, consumed_quantity) in enumerate(consumers):

            if person not in people:
                raise ValueError(
                    f"Unknown person: {person}"
                )

            consumed_quantity = Decimal(str(consumed_quantity))

            if consumed_quantity <= 0:
                continue

            if index == len(consumers) - 1:
                amount = remaining_amount
            else:
                ratio = consumed_quantity / quantity

                amount = money(
                    total_price * ratio
                )

                remaining_amount -= amount

            person_subtotals[person] += amount

            person_items[person].append({
                "name": name,
                "quantity": float(consumed_quantity),
                "amount": float(amount)
            })

    # -----------------------------------
    # Calculate bill-level adjustments
    # -----------------------------------

    total_subtotal = sum(person_subtotals.values())

    discount = money(discount)
    tax = money(tax)
    service_charge = money(service_charge)

    results = {}

    for person in people:

        subtotal = person_subtotals[person]

        if total_subtotal > 0:
            proportion = subtotal / total_subtotal
        else:
            proportion = Decimal("0")

        person_discount = money(
            discount * proportion
        )

        person_tax = money(
            tax * proportion
        )

        person_service = money(
            service_charge * proportion
        )

        final_total = (
            subtotal
            - person_discount
            + person_tax
            + person_service
        )

        results[person] = {
            "items": person_items[person],
            "subtotal": float(money(subtotal)),
            "discount": float(person_discount),
            "tax": float(person_tax),
            "service_charge": float(person_service),
            "total": float(money(final_total))
        }

    # -----------------------------------
    # Final verification
    # -----------------------------------

    calculated_total = (
        total_subtotal
        - discount
        + tax
        + service_charge
    )

    assigned_total = sum(
        Decimal(str(results[p]["total"]))
        for p in people
    )

    return {
        "people": results,
        "calculated_bill_total": float(
            money(calculated_total)
        ),
        "assigned_total": float(
            money(assigned_total)
        ),
        "difference": float(
            money(assigned_total - calculated_total)
        )
    }