import os
import pymupdf
from PIL import Image as PILImage
import tempfile
from detector import ResumeFraudDetector

def create_synthetic_resumes_dir():
    test_dir = os.path.join(os.path.dirname(__file__), "test_artifacts")
    os.makedirs(test_dir, exist_ok=True)
    return test_dir

def generate_clean_resume(out_path: str):
    """Generates a standard clean PDF resume with visible text and margins."""
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)  # A4 size
    
    # Visible header
    page.insert_text((50, 60), "John Doe - Senior Software Engineer", fontsize=18, color=(0.1, 0.1, 0.1))
    page.insert_text((50, 90), "Email: john.doe@example.com | Phone: +1 555-0199", fontsize=11, color=(0.2, 0.2, 0.2))
    
    # Visible experience
    page.insert_text((50, 140), "Work Experience:", fontsize=14, color=(0, 0, 0))
    page.insert_text((50, 170), "- Led development of scalable microservices using Python, FastAPI, and PostgreSQL.", fontsize=10, color=(0.2, 0.2, 0.2))
    page.insert_text((50, 195), "- Designed cloud architecture on AWS with Docker and Terraform.", fontsize=10, color=(0.2, 0.2, 0.2))
    
    doc.save(out_path)
    doc.close()

def generate_fraud_resume_all_checks(out_path: str):
    """
    Generates a resume injecting all 4 fraud techniques:
    1. White-fonting (#FFFFFF)
    2. Tiny text (1.5pt)
    3. Off-margin text (x=-30 or y=850)
    4. Text hidden behind an opaque image
    """
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    
    # Standard visible text
    page.insert_text((50, 60), "Jane Smith - Candidate Profile", fontsize=18, color=(0.1, 0.1, 0.1))
    page.insert_text((50, 90), "Experience: Junior Developer with 1 year Python experience.", fontsize=11, color=(0.2, 0.2, 0.2))
    
    # 1. WHITE-FONTING (Invisible white text: RGB 1.0, 1.0, 1.0)
    page.insert_text(
        (50, 150),
        "Python MachineLearning DeepLearning PyTorch Kubernetes AWS Terraform React GraphQL Senior Architect 10+ Years",
        fontsize=10,
        color=(1.0, 1.0, 1.0)  # Pure White Font
    )
    
    # 2. TINY-TEXT (Microscopic 1.5pt font size)
    page.insert_text(
        (50, 200),
        "AWS Certified Solutions Architect Expert Kubernetes C++ Rust Lead Engineer",
        fontsize=1.5,  # Tiny font
        color=(0.1, 0.1, 0.1)
    )
    
    # 3. OFF-MARGIN TEXT (Placed outside printable page boundaries: x=-40, y=900)
    page.insert_text(
        (-40, 300),
        "Keywords: GCP Azure Golang Distributed Systems",
        fontsize=10,
        color=(0.1, 0.1, 0.1)
    )
    
    # 4. TEXT HIDDEN BEHIND IMAGE
    page.insert_text(
        (60, 430),
        "SECRET_QUALIFICATIONS: Ex-Google Principal Engineer Ph.D. MIT",
        fontsize=11,
        color=(0, 0, 0)
    )
    img_rect = pymupdf.Rect(50, 400, 350, 460)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_img:
        tmp_img_path = tmp_img.name
        img = PILImage.new("RGB", (300, 60), color=(240, 240, 240))
        img.save(tmp_img_path)
    
    page.insert_image(img_rect, filename=tmp_img_path)
    
    doc.save(out_path)
    doc.close()
    if os.path.exists(tmp_img_path):
        os.remove(tmp_img_path)


def run_tests():
    detector = ResumeFraudDetector()
    test_dir = create_synthetic_resumes_dir()
    
    clean_pdf = os.path.join(test_dir, "clean_resume.pdf")
    fraud_pdf = os.path.join(test_dir, "fraud_injected_resume.pdf")
    
    print("==================================================")
    print("1. Generating Synthetic Test Resumes...")
    print("==================================================")
    generate_clean_resume(clean_pdf)
    print(f"Generated clean resume: {clean_pdf}")
    generate_fraud_resume_all_checks(fraud_pdf)
    print(f"Generated fraud-injected resume: {fraud_pdf}")
    
    print("\n==================================================")
    print("2. Scanning Clean Resume...")
    print("==================================================")
    clean_report = detector.scan_pdf(clean_pdf)
    print(f"Fraud Detected: {clean_report.fraud_detected}")
    print(f"Risk Score: {clean_report.risk_score}/100")
    print(f"Summary: {clean_report.scan_summary}")
    print(f"Total Findings: {clean_report.total_findings}")
    assert not clean_report.fraud_detected, "Clean resume incorrectly flagged as fraud!"
    print("✓ Clean Resume PASS")

    print("\n==================================================")
    print("3. Scanning Fraud-Injected Resume...")
    print("==================================================")
    fraud_report = detector.scan_pdf(fraud_pdf)
    print(f"Fraud Detected: {fraud_report.fraud_detected}")
    print(f"Risk Score: {fraud_report.risk_score}/100")
    print(f"Summary: {fraud_report.scan_summary}")
    print(f"Total Findings: {fraud_report.total_findings}")
    
    found_types = {f.fraud_type for f in fraud_report.findings}
    print(f"\nDetected Fraud Categories: {found_types}")
    
    print("\nDetailed Findings Breakdown:")
    for idx, f in enumerate(fraud_report.findings, start=1):
        print(f"  [{idx}] Type: {f.fraud_type.upper()} | Severity: {f.severity.upper()}")
        print(f"      Description: {f.description}")
        print(f"      Extracted Text: \"{f.extracted_text}\"")
        print(f"      Detected: {f.detected_value} | Expected: {f.expected_value}")
        print(f"      BBox: {f.bounding_box}\n")
    
    assert "white_font" in found_types, "Failed to detect white-fonting!"
    assert "tiny_text" in found_types, "Failed to detect tiny-text!"
    assert "off_margin_text" in found_types, "Failed to detect off-margin text!"
    assert "hidden_behind_image" in found_types, "Failed to detect text hidden behind images!"
    
    print("==================================================")
    print("✓ ALL FRAUD DETECTION CHECKS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
