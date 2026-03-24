from typing import Annotated
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi import status as http_status
from sqlalchemy.orm import Session

from database.connection import get_db
from models.schemas import PersonCreate, PersonRead
from repositories.people_repo import PeopleRepository

router = APIRouter()
logger = logging.getLogger(__name__)


def get_people_repository(db: Session = Depends(get_db)) -> PeopleRepository:
    return PeopleRepository(db)


@router.get("")
def list_people(
    repository: Annotated[PeopleRepository, Depends(get_people_repository)],
) -> list[PersonRead]:
    people = [PersonRead.model_validate(person) for person in repository.list()]
    logger.info("people_list_success count=%s", len(people))
    return people


@router.post("", status_code=http_status.HTTP_201_CREATED)
def create_person(
    payload: PersonCreate,
    repository: Annotated[PeopleRepository, Depends(get_people_repository)],
) -> PersonRead:
    logger.debug("people_create_start name=%s", payload.name)
    person = repository.create(payload.name.strip())
    logger.info("people_create_success person_id=%s", person.id)
    return PersonRead.model_validate(person)


@router.delete("/{person_id}", status_code=http_status.HTTP_204_NO_CONTENT)
def delete_person(
    person_id: int,
    repository: Annotated[PeopleRepository, Depends(get_people_repository)],
) -> None:
    deleted = repository.delete(person_id)
    if not deleted:
        logger.error("people_delete_not_found field=person_id value=%s", person_id)
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail="Person not found")
    logger.info("people_delete_success person_id=%s", person_id)
