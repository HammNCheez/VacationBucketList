from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import PersonCreate, PersonRead
from repositories.people_repo import PeopleRepository

router = APIRouter()


def get_people_repository(db: Session = Depends(get_db)) -> PeopleRepository:
    return PeopleRepository(db)


@router.get("")
def list_people(
    repository: Annotated[PeopleRepository, Depends(get_people_repository)],
) -> list[PersonRead]:
    return [PersonRead.model_validate(person) for person in repository.list()]


@router.post("", status_code=http_status.HTTP_201_CREATED)
def create_person(
    payload: PersonCreate,
    repository: Annotated[PeopleRepository, Depends(get_people_repository)],
) -> PersonRead:
    person = repository.create(payload.name.strip())
    return PersonRead.model_validate(person)


@router.delete("/{person_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_person(
    person_id: int,
    repository: Annotated[PeopleRepository, Depends(get_people_repository)],
) -> None:
    deleted = repository.delete(person_id)
    if not deleted:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Person not found")
