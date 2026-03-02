def to_title_case(value: str) -> str:
    if not value:
        return ""
    return value.strip().title()


def normalize_title_case_list(values: list[str]) -> list[str]:
    normalized = [to_title_case(item) for item in values if item and item.strip()]
    return sorted(set(normalized))
