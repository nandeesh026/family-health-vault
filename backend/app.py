from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import bcrypt
import os
import hashlib
import uuid

from models import db, User, Family, FamilyMember, Report, ExtractedValue
from ocr_utils import extract_text_from_image, parse_values_from_text

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])

app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}
IMAGE_EXTENSIONS = {"png", "jpg", "jpeg"}
MAX_FILE_SIZE = 10 * 1024 * 1024
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE

db.init_app(app)
jwt = JWTManager(app)

with app.app_context():
    db.create_all()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_extension(filename):
    return filename.rsplit(".", 1)[1].lower() if "." in filename else ""


def compute_file_hash(filepath):
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "message": "Backend is running"})


@app.route("/api/db-check")
def db_check():
    try:
        db.session.execute(db.text("SELECT 1"))
        return jsonify({"database": "connected"})
    except Exception as e:
        return jsonify({"database": "error", "details": str(e)}), 500


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    family_name = data.get("family_name", f"{name}'s Family")

    if not name or not email or not password:
        return jsonify({"error": "Name, email, and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_user = User(name=name, email=email, password_hash=password_hash, role="family_admin")
    db.session.add(new_user)
    db.session.commit()

    new_family = Family(name=family_name, admin_user_id=new_user.id)
    db.session.add(new_family)
    db.session.commit()

    access_token = create_access_token(identity=str(new_user.id))
    return jsonify({
        "message": "Registration successful",
        "user": new_user.to_dict(),
        "family": new_family.to_dict(),
        "access_token": access_token
    }), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password_hash.encode("utf-8")):
        return jsonify({"error": "Invalid email or password"}), 401

    family = Family.query.filter_by(admin_user_id=user.id).first()
    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "user": user.to_dict(),
        "family": family.to_dict() if family else None,
        "access_token": access_token
    }), 200


@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()})


@app.route("/api/families/<int:family_id>/members", methods=["GET"])
@jwt_required()
def get_members(family_id):
    members = FamilyMember.query.filter_by(family_id=family_id).all()
    return jsonify({"members": [m.to_dict() for m in members]})


@app.route("/api/families/<int:family_id>/members", methods=["POST"])
@jwt_required()
def add_member(family_id):
    data = request.get_json()
    name = data.get("name")
    if not name:
        return jsonify({"error": "Member name is required"}), 400

    new_member = FamilyMember(
        family_id=family_id,
        name=name,
        blood_group=data.get("blood_group"),
        relation=data.get("relation"),
        emergency_contact_name=data.get("emergency_contact_name"),
        emergency_contact_phone=data.get("emergency_contact_phone"),
        allergies=data.get("allergies"),
        current_medications=data.get("current_medications")
    )
    db.session.add(new_member)
    db.session.commit()
    return jsonify({"message": "Member added", "member": new_member.to_dict()}), 201


@app.route("/api/members/<int:member_id>", methods=["PUT"])
@jwt_required()
def update_member(member_id):
    member = FamilyMember.query.get(member_id)
    if not member:
        return jsonify({"error": "Family member not found"}), 404

    data = request.get_json()
    for field in ["name", "blood_group", "relation", "emergency_contact_name",
                  "emergency_contact_phone", "allergies", "current_medications"]:
        if field in data:
            setattr(member, field, data[field])

    db.session.commit()
    return jsonify({"message": "Member updated", "member": member.to_dict()})


@app.route("/api/members/<int:member_id>/reports", methods=["POST"])
@jwt_required()
def upload_report(member_id):
    user_id = get_jwt_identity()

    member = FamilyMember.query.get(member_id)
    if not member:
        return jsonify({"error": "Family member not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file was sent"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed. Use PDF, PNG, or JPG"}), 400

    original_filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    file.save(filepath)

    file_hash = compute_file_hash(filepath)
    extension = get_extension(original_filename)

    new_report = Report(
        member_id=member_id,
        file_path=unique_name,
        original_filename=original_filename,
        file_hash=file_hash,
        uploaded_by=user_id,
        report_type=request.form.get("report_type", "lab_report"),
        ocr_status="pending"
    )
    db.session.add(new_report)
    db.session.commit()

    if extension in IMAGE_EXTENSIONS:
        raw_text = extract_text_from_image(filepath)

        if raw_text.startswith("__OCR_ERROR__"):
            new_report.ocr_status = "failed"
            new_report.ocr_raw_text = raw_text
        else:
            new_report.ocr_status = "done"
            new_report.ocr_raw_text = raw_text

            extracted = parse_values_from_text(raw_text)
            for item in extracted:
                ev = ExtractedValue(
                    report_id=new_report.id,
                    parameter_name=item["parameter_name"],
                    value=item["value"],
                    unit=item["unit"],
                    normal_range_low=item["normal_range_low"],
                    normal_range_high=item["normal_range_high"],
                    is_abnormal=item["is_abnormal"]
                )
                db.session.add(ev)
    else:
        new_report.ocr_status = "unsupported"

    db.session.commit()

    return jsonify({
        "message": "Report uploaded and hashed successfully",
        "report": new_report.to_dict()
    }), 201


@app.route("/api/members/<int:member_id>/reports", methods=["GET"])
@jwt_required()
def get_reports(member_id):
    reports = Report.query.filter_by(member_id=member_id).order_by(Report.uploaded_at.desc()).all()
    return jsonify({"reports": [r.to_dict() for r in reports]})


@app.route("/api/reports/<int:report_id>", methods=["GET"])
@jwt_required()
def get_report_detail(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    values = ExtractedValue.query.filter_by(report_id=report_id).all()

    return jsonify({
        "report": report.to_dict(),
        "ocr_raw_text": report.ocr_raw_text,
        "extracted_values": [v.to_dict() for v in values]
    })


@app.route("/api/reports/<int:report_id>", methods=["DELETE"])
@jwt_required()
def delete_report(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    ExtractedValue.query.filter_by(report_id=report_id).delete()

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], report.file_path)
    if os.path.exists(filepath):
        os.remove(filepath)

    db.session.delete(report)
    db.session.commit()

    return jsonify({"message": "Report deleted"})


@app.route("/api/reports/<int:report_id>/verify", methods=["GET"])
@jwt_required()
def verify_report(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404

    filepath = os.path.join(app.config["UPLOAD_FOLDER"], report.file_path)
    if not os.path.exists(filepath):
        return jsonify({"status": "FILE_MISSING", "message": "The file is no longer on disk"}), 404

    current_hash = compute_file_hash(filepath)

    if current_hash == report.file_hash:
        return jsonify({"status": "VERIFIED", "message": "This file matches its original hash and has not been altered"})
    else:
        return jsonify({"status": "TAMPERED", "message": "This file's hash does not match the original. It may have been modified"})


@app.route("/api/reports/<int:report_id>/download", methods=["GET"])
@jwt_required()
def download_report(report_id):
    report = Report.query.get(report_id)
    if not report:
        return jsonify({"error": "Report not found"}), 404
    return send_from_directory(app.config["UPLOAD_FOLDER"], report.file_path, download_name=report.original_filename)


@app.route("/api/members/<int:member_id>/trends", methods=["GET"])
@jwt_required()
def get_trends(member_id):
    values = (
        db.session.query(ExtractedValue, Report.uploaded_at)
        .join(Report, ExtractedValue.report_id == Report.id)
        .filter(Report.member_id == member_id)
        .order_by(Report.uploaded_at.asc())
        .all()
    )

    trends = {}
    for value, uploaded_at in values:
        if value.parameter_name not in trends:
            trends[value.parameter_name] = []
        trends[value.parameter_name].append({
            "value": value.value,
            "unit": value.unit,
            "date": uploaded_at.isoformat() if uploaded_at else None,
            "is_abnormal": value.is_abnormal,
            "normal_range_low": value.normal_range_low,
            "normal_range_high": value.normal_range_high
        })

    return jsonify({"trends": trends})


# ---------- Public emergency card (no login required) ----------
@app.route("/api/public/members/<int:member_id>/emergency", methods=["GET"])
def get_emergency_card(member_id):
    member = FamilyMember.query.get(member_id)
    if not member:
        return jsonify({"error": "Not found"}), 404
    return jsonify(member.to_emergency_dict())


if __name__ == "__main__":
    app.run(debug=True)