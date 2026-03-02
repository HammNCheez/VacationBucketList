from services.formatting import to_title_case


def test_title_case_lowercase() -> None:
    assert to_title_case("camping") == "Camping"


def test_title_case_uppercase() -> None:
    assert to_title_case("FAMILY TRIP") == "Family Trip"


def test_title_case_phrase() -> None:
    assert to_title_case("the rocky mountains") == "The Rocky Mountains"


def test_title_case_empty() -> None:
    assert to_title_case("") == ""
