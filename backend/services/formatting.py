import json


def to_title_case(value: str) -> str:
    if not value:
        return ""
    return value.strip().title()


def normalize_title_case_list(values: list[str]) -> list[str]:
    normalized = [to_title_case(item) for item in values if item and item.strip()]
    return sorted(set(normalized))


def trip_types_from_db(value: str) -> list[str]:
    """Parse a JSON-encoded trip_types string from the database into a list of strings."""
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        pass
    return []
