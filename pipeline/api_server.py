from flask import Flask, request, jsonify
import os
import tempfile
import shutil
from werkzeug.utils import secure_filename
from enroll import generate_embedding_for_person
from run_pipeline import analyze_video
import json

app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = "temp_uploads"
# Use relative path from the pipeline directory
PIPELINE_DB_DIR = os.path.join(os.path.dirname(__file__), "data", "output", "embeddings", "known_db")
if not os.path.exists(PIPELINE_DB_DIR):
    os.makedirs(PIPELINE_DB_DIR, exist_ok=True)
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "pipeline-api"})

@app.route("/enroll", methods=["POST"])
def enroll_student():
    """Enroll a student using the pipeline model"""
    try:
        name = request.form.get("name")
        rollno = request.form.get("rollno", "")
        
        if not name:
            return jsonify({"error": "Missing name parameter"}), 400
        
        # Get uploaded files
        files = request.files.getlist("photos")
        if not files or len(files) == 0:
            return jsonify({"error": "No photo files provided"}), 400
        
        # Create temporary directory for this person's images
        temp_person_dir = os.path.join(UPLOAD_FOLDER, f"{name}_{rollno}" if rollno else name)
        os.makedirs(temp_person_dir, exist_ok=True)
        
        # Save uploaded files
        saved_files = []
        for file in files:
            if file.filename:
                filename = secure_filename(file.filename)
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    filepath = os.path.join(temp_person_dir, filename)
                    file.save(filepath)
                    saved_files.append(filepath)
        
        if not saved_files:
            shutil.rmtree(temp_person_dir, ignore_errors=True)
            return jsonify({"error": "No valid image files provided"}), 400
        
        # Generate embeddings using pipeline
        person_id = f"{name}_{rollno}" if rollno else name
        success = generate_embedding_for_person(temp_person_dir, PIPELINE_DB_DIR, person_id)
        
        # Cleanup temporary files
        shutil.rmtree(temp_person_dir, ignore_errors=True)
        
        if success:
            return jsonify({"message": f"Successfully enrolled {name}", "person_id": person_id})
        else:
            return jsonify({"error": "Failed to generate embeddings"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Enrollment failed: {str(e)}"}), 500

@app.route("/enroll-professor", methods=["POST"])
def enroll_professor():
    """Enroll a professor using the pipeline model"""
    try:
        name = request.form.get("name")
        subject = request.form.get("subject", "")
        
        if not name:
            return jsonify({"error": "Missing name parameter"}), 400
        
        # Get uploaded files
        files = request.files.getlist("photos")
        if not files or len(files) == 0:
            return jsonify({"error": "No photo files provided"}), 400
        
        # Create temporary directory for this person's images
        temp_person_dir = os.path.join(UPLOAD_FOLDER, f"prof_{name}_{subject}" if subject else f"prof_{name}")
        os.makedirs(temp_person_dir, exist_ok=True)
        
        # Save uploaded files
        saved_files = []
        for file in files:
            if file.filename:
                filename = secure_filename(file.filename)
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    filepath = os.path.join(temp_person_dir, filename)
                    file.save(filepath)
                    saved_files.append(filepath)
        
        if not saved_files:
            shutil.rmtree(temp_person_dir, ignore_errors=True)
            return jsonify({"error": "No valid image files provided"}), 400
        
        # Generate embeddings using pipeline
        person_id = f"prof_{name}_{subject}" if subject else f"prof_{name}"
        success = generate_embedding_for_person(temp_person_dir, PIPELINE_DB_DIR, person_id)
        
        # Cleanup temporary files
        shutil.rmtree(temp_person_dir, ignore_errors=True)
        
        if success:
            return jsonify({"message": f"Successfully enrolled professor {name}", "person_id": person_id})
        else:
            return jsonify({"error": "Failed to generate embeddings"}), 500
            
    except Exception as e:
        return jsonify({"error": f"Professor enrollment failed: {str(e)}"}), 500

@app.route("/video_recognize", methods=["POST"])
def video_recognize():
    """Analyze video for face recognition using pipeline model"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No video file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No video file selected"}), 400
        
        # Save uploaded video to temporary file
        temp_video_path = None
        try:
            # Create temporary file with proper extension
            suffix = os.path.splitext(secure_filename(file.filename))[1]
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
                temp_video_path = temp_file.name
                file.save(temp_video_path)
            
            # Analyze video using pipeline
            results = analyze_video(temp_video_path, return_results=True)
            
            if results["success"]:
                return jsonify(results)
            else:
                return jsonify({"error": results.get("error", "Video analysis failed")}), 500
                
        finally:
            # Cleanup temporary video file
            if temp_video_path and os.path.exists(temp_video_path):
                os.unlink(temp_video_path)
                
    except Exception as e:
        return jsonify({"error": f"Video analysis failed: {str(e)}"}), 500

@app.route("/delete_person", methods=["POST"])
def delete_person():
    """Delete a person's embedding from the pipeline database"""
    try:
        data = request.get_json()
        person_id = data.get("person_id")
        
        if not person_id:
            return jsonify({"error": "Missing person_id parameter"}), 400
        
        # Delete embedding file
        embedding_path = os.path.join(PIPELINE_DB_DIR, f"{person_id}.npy")
        if os.path.exists(embedding_path):
            os.remove(embedding_path)
            return jsonify({"message": f"Successfully deleted {person_id}"})
        else:
            return jsonify({"error": f"Embedding file not found for {person_id}"}), 404
            
    except Exception as e:
        return jsonify({"error": f"Deletion failed: {str(e)}"}), 500

if __name__ == "__main__":
    print(f"[*] Pipeline API Server starting...")
    print(f"[*] Using database directory: {PIPELINE_DB_DIR}")
    app.run(host="0.0.0.0", port=5000, debug=True)
