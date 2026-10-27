from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="family_admin")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "email": self.email, "role": self.role}


class Family(db.Model):
    __tablename__ = "families"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    admin_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    members = db.relationship("FamilyMember", backref="family", lazy=True)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "admin_user_id": self.admin_user_id}


class FamilyMember(db.Model):
    __tablename__ = "family_members"

    id = db.Column(db.Integer, primary_key=True)
    family_id = db.Column(db.Integer, db.ForeignKey("families.id"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    dob = db.Column(db.Date, nullable=True)
    blood_group = db.Column(db.String(5), nullable=True)
    relation = db.Column(db.String(50), nullable=True)
    linked_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    emergency_contact_name = db.Column(db.String(120), nullable=True)
    emergency_contact_phone = db.Column(db.String(20), nullable=True)
    allergies = db.Column(db.String(500), nullable=True)
    current_medications = db.Column(db.String(500), nullable=True)

    reports = db.relationship("Report", backref="member", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "family_id": self.family_id,
            "name": self.name,
            "dob": self.dob.isoformat() if self.dob else None,
            "blood_group": self.blood_group,
            "relation": self.relation,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone,
            "allergies": self.allergies,
            "current_medications": self.current_medications
        }

    def to_emergency_dict(self):
        """Limited public-safe fields only, for the no-login emergency card."""
        return {
            "name": self.name,
            "blood_group": self.blood_group,
            "allergies": self.allergies,
            "current_medications": self.current_medications,
            "emergency_contact_name": self.emergency_contact_name,
            "emergency_contact_phone": self.emergency_contact_phone
        }


class Report(db.Model):
    __tablename__ = "reports"

    id = db.Column(db.Integer, primary_key=True)
    member_id = db.Column(db.Integer, db.ForeignKey("family_members.id"), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_hash = db.Column(db.String(64), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    report_type = db.Column(db.String(50), nullable=True)
    ocr_status = db.Column(db.String(20), default="pending")
    ocr_raw_text = db.Column(db.Text, nullable=True)

    extracted_values = db.relationship("ExtractedValue", backref="report", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "member_id": self.member_id,
            "original_filename": self.original_filename,
            "file_hash": self.file_hash,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "report_type": self.report_type,
            "ocr_status": self.ocr_status
        }


class ExtractedValue(db.Model):
    __tablename__ = "extracted_values"

    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey("reports.id"), nullable=False)
    parameter_name = db.Column(db.String(100), nullable=False)
    value = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(30), nullable=True)
    normal_range_low = db.Column(db.Float, nullable=True)
    normal_range_high = db.Column(db.Float, nullable=True)
    is_abnormal = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "report_id": self.report_id,
            "parameter_name": self.parameter_name,
            "value": self.value,
            "unit": self.unit,
            "normal_range_low": self.normal_range_low,
            "normal_range_high": self.normal_range_high,
            "is_abnormal": self.is_abnormal
        }