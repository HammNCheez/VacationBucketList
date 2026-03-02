from sqlalchemy.orm import Session

from models.db import Person, Trip
from repositories.base import IPeopleRepository


class PeopleRepository(IPeopleRepository):
    def __init__(self, db: Session) -> None:
        self.db = db

    def list(self) -> list[Person]:
        return self.db.query(Person).order_by(Person.name.asc()).all()

    def create(self, name: str) -> Person:
        person = Person(name=name)
        self.db.add(person)
        self.db.commit()
        self.db.refresh(person)
        return person

    def delete(self, person_id: int) -> bool:
        person = self.db.query(Person).filter(Person.id == person_id).first()
        if not person:
            return False

        trips = self.db.query(Trip).all()
        for trip in trips:
            if person in trip.people:
                trip.people.remove(person)

        self.db.delete(person)
        self.db.commit()
        return True
