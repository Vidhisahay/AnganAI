from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Text,
    DateTime,
    Date,
    ForeignKey,
)

from sqlalchemy.orm import relationship

from .database import Base


class Child(Base):
    __tablename__ = "children"

    id = Column(Integer, primary_key=True, index=True)

    child_code = Column(String, unique=True, nullable=False, index=True)

    name = Column(String, nullable=False)

    date_of_birth = Column(Date, nullable=True)

    age = Column(Integer, nullable=False)

    gender = Column(String, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    assessments = relationship(
        "Assessment",
        back_populates="child",
        cascade="all, delete-orphan"
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)

    child_id = Column(
        Integer,
        ForeignKey("children.id"),
        nullable=False
    )

    height = Column(Float, nullable=False)

    weight = Column(Float, nullable=False)

    muac = Column(Float, nullable=True)

    growth_status = Column(String, nullable=True)

    risk_level = Column(String, nullable=True)

    summary = Column(Text, nullable=True)

    recommendation = Column(Text, nullable=True)

    follow_up_days = Column(Integer, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    age = Column(Integer, nullable=False)

    child = relationship(
        "Child",
        back_populates="assessments"
    )

    nutrition_plan = relationship(
        "NutritionPlan",
        back_populates="assessment",
        uselist=False,
        cascade="all, delete-orphan"
    )

    report = relationship(
        "Report",
        back_populates="assessment",
        uselist=False,
        cascade="all, delete-orphan"
    )


class NutritionPlan(Base):
    __tablename__ = "nutrition_plans"

    id = Column(Integer, primary_key=True, index=True)

    assessment_id = Column(
        Integer,
        ForeignKey("assessments.id"),
        nullable=False,
        unique=True
    )

    breakfast = Column(Text, nullable=True)

    lunch = Column(Text, nullable=True)

    evening_snack = Column(Text, nullable=True)

    dinner = Column(Text, nullable=True)

    supplement = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    assessment = relationship(
        "Assessment",
        back_populates="nutrition_plan"
    )


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    assessment_id = Column(
        Integer,
        ForeignKey("assessments.id"),
        nullable=False,
        unique=True
    )

    summary = Column(Text, nullable=True)

    parent_advice = Column(Text, nullable=True)

    worker_notes = Column(Text, nullable=True)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    assessment = relationship(
        "Assessment",
        back_populates="report"
    )
