from services.formatting import to_title_case, trip_types_from_db


def test_title_case_lowercase() -> None:
    assert to_title_case("camping") == "Camping"


def test_title_case_uppercase() -> None:
    assert to_title_case("FAMILY TRIP") == "Family Trip"


def test_title_case_phrase() -> None:
    assert to_title_case("the rocky mountains") == "The Rocky Mountains"


def test_title_case_empty() -> None:
    assert to_title_case("") == ""


def test_trip_types_from_db_valid() -> None:
    assert trip_types_from_db('["Beach", "Camping"]') == ["Beach", "Camping"]


def test_trip_types_from_db_empty_list() -> None:
    assert trip_types_from_db("[]") == []


def test_trip_types_from_db_invalid_json() -> None:
    assert trip_types_from_db("not-json") == []


def test_trip_types_from_db_non_list_json() -> None:
    assert trip_types_from_db('"just a string"') == []
