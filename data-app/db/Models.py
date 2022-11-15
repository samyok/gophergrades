from sqlalchemy import Column, Integer, SmallInteger, ForeignKey, VARCHAR, JSON, Float, Table, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, Session

"""
This file establishes the ORM for SqlAlchemy.

Has definitions for Libeds, Distributions, Class Distributions, Professors, and Department Distributions.
"""


Base = declarative_base()

libedAssociationTable = Table(
    "libedAssociationTable",
    Base.metadata,
    Column("left_id", ForeignKey("libed.id"),primary_key=True),
    Column("right_id", ForeignKey("classdistribution.id"),primary_key=True),
)

class Libed(Base):
    __tablename__ = "libed"
    id = Column(Integer,primary_key=True)
    name = Column(VARCHAR(128),nullable=False)
    class_dists = relationship('ClassDistribution',secondary=libedAssociationTable,back_populates="libeds")
    def __str__(self) -> str:
        retVal = f"Libed: {self.name}"
        for class_dist in self.class_dists:
            retVal += "\n" + str(class_dist)
        return retVal       
    def __repr__(self) -> str:
        return f"Libed: {self.name}"


class Distribution(Base):
    __tablename__ = "distribution"
    id = Column(Integer,primary_key=True)
    students = Column(Integer,nullable=False)
    terms = Column(Integer,nullable=False)
    grades = Column(JSON,nullable=False)
    class_id = Column(Integer,ForeignKey('classdistribution.id',ondelete='CASCADE'),nullable=False)
    professor_id = Column(Integer,ForeignKey('professor.id',ondelete='CASCADE'),nullable=True)
    # There are ocassionally classes that do not have a professor listed, hence why this is nullable
    # It will be displayed as unlisted professor in class distributions.
    def __str__(self) -> str:
        return f"A class with {self.students} students, taught over {self.terms} terms with a distribution of {self.grades}."
    def __repr__(self) -> str:
        if self.prof:
            return f"{self.classdist.class_name} taught by {self.prof.name} with {self.students} students over {self.terms} terms. Has a distribution of {self.grades}"
        else: 
            return f"{self.classdist.class_name} taught by an Unknown Professor with {self.students} students over {self.terms} terms. Has a distribution of {self.grades}"

class Professor(Base):
    __tablename__ = "professor"
    id = Column(Integer,primary_key=True)
    name = Column(VARCHAR(255),nullable=False)
    RMP_score = Column(Float,nullable=True)
    dists = relationship('Distribution',backref="prof")

    def __repr__(self) -> str:
        retVal = f"{self.name} has a RMP of {self.RMP_score} and has the following distributions\n"
        for dist in self.dists:
            retVal += f"{repr(dist)}\n"
        return retVal


class ClassDistribution(Base):
    __tablename__ = "classdistribution"
    id = Column(Integer,primary_key=True)
    class_name = Column(VARCHAR(10),nullable=False)
    class_desc = Column(VARCHAR(255),nullable=False)
    total_students = Column(Integer,nullable=False)
    total_grades = Column(JSON,nullable=False)
    onestop = Column(VARCHAR(512),nullable=True)
    cred_min = Column(SmallInteger,nullable=True)
    cred_max = Column(SmallInteger,nullable=True)

    department_id = Column(Integer, ForeignKey('departmentdistribution.id',ondelete="CASCADE"))
    dists = relationship('Distribution',backref="classdist")
    libeds = relationship('Libed',secondary=libedAssociationTable,back_populates="class_dists")

    def __str__(self) -> str:
        return f"{self.class_name}: {self.total_grades}"

    def __repr__(self) -> str:
        retVal = f"{self.class_name} ({self.class_desc}) has been taught to {self.total_students} with an overall distribution of {self.total_grades} comprised of the following:\n"
        for dist in self.dists:
            retVal += f"{repr(dist)}\n"
        return retVal

class DepartmentDistribution(Base):
    __tablename__ = "departmentdistribution"
    id = Column(Integer,primary_key=True)
    dept_abbr = Column(VARCHAR(4),nullable=False)
    dept_name = Column(VARCHAR(255),nullable=False)
    class_dists = relationship('ClassDistribution',backref="dept")
    def __repr__(self) -> str:
        retVal = f"The department of {self.dept_abbr} - {self.dept_name} has the following distributions:\n"
        for dist in self.class_dists:
            retVal += f"{str(dist)}\n"
        return retVal


engine = create_engine("sqlite:///../ProcessedData.db",echo=False,future=True)
if __name__ == "__main__":
    Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
session = Session(engine)
