import argparse
import os
from face_lib.engine import FaceRecognitionEngine

# Use relative path from the pipeline directory
DB_DIR = os.path.join(os.path.dirname(__file__), "data", "output", "embeddings", "known_db")

def analyze_video(video_path, return_results=False):
    """Runs the full face recognition pipeline on a video.
    
    Args:
        video_path: Path to the video file
        return_results: If True, return detailed results instead of just success/failure
    
    Returns:
        If return_results=False: Boolean indicating success
        If return_results=True: Dict with analysis results
    """
    # Validate video file exists
    if not os.path.exists(video_path):
        error_msg = f"[ERROR] Video file does not exist: {video_path}"
        print(error_msg)
        if return_results:
            return {"success": False, "error": error_msg, "summary": []}
        return False
    
    # Check if database directory exists
    if not os.path.exists(DB_DIR) or not os.listdir(DB_DIR):
        error_msg = f"[ERROR] No known faces database found at: {DB_DIR}"
        print(error_msg)
        print("Please run enroll.py first to add known faces to the database.")
        if return_results:
            return {"success": False, "error": error_msg, "summary": []}
        return False
    
    print(f"[*] Analyzing video: {video_path}")
    print(f"[*] Using database: {DB_DIR}")
    
    engine = FaceRecognitionEngine()
    
    recognized_people = set()
    recognition_details = {}
    face_count = 0
    processed_faces = 0

    # Generator function yields embeddings directly
    embedding_generator = engine.detect_faces_and_embeddings(video_path)

    for input_embedding in embedding_generator:
        face_count += 1
        print(f"  Processing face #{face_count}...")
        
        if input_embedding is not None:
            processed_faces += 1
            print(f"    Got embedding with shape: {input_embedding.shape}")
            # Compare against the known database with debug info
            name, score = engine.compare_embeddings(input_embedding, DB_DIR, threshold=0.6, debug=True)
            
            if name != "Unknown":
                if name not in recognized_people:
                    print(f"[+] Found {name}! (Similarity: {score:.2f})")
                    recognized_people.add(name)
                    recognition_details[name] = {"confidence": score, "first_detection": face_count}
                else:
                    print(f"  Already recognized: {name} (score: {score:.4f})")
                    # Update confidence if higher
                    if score > recognition_details[name]["confidence"]:
                        recognition_details[name]["confidence"] = score
        else:
            print(f"  Could not process face #{face_count}")
    
    print(f"\n[*] Statistics:")
    print(f"  Total faces detected: {face_count}")
    print(f"  Faces processed: {processed_faces}")

    print("\n--- Analysis Complete ---")
    if recognized_people:
        print("Recognized individuals in the video:")
        for person in sorted(list(recognized_people)):
            print(f"- {person}")
    else:
        print("No known individuals were recognized in the video.")
    
    if return_results:
        # Format results for API response
        summary = []
        for person in recognized_people:
            # Extract student name from person_id (format: name_rollno or prof_name_subject)
            if person.startswith("prof_"):
                # Professor format: prof_name_subject
                user_name = person[5:]  # Remove 'prof_' prefix
            else:
                # Student format: name_rollno - extract just the name
                parts = person.split("_")
                user_name = parts[0] if parts else person
            
            summary.append({
                "user": user_name,
                "person_id": person,
                "confidence": float(recognition_details[person]["confidence"]),  # Convert to Python float
                "first_detection_frame": int(recognition_details[person]["first_detection"])  # Convert to Python int
            })
        
        return {
            "success": True,
            "total_faces_detected": face_count,
            "faces_processed": processed_faces,
            "recognized_count": len(recognized_people),
            "summary": summary
        }
    
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze a video to recognize known faces.")
    parser.add_argument('--video', type=str, required=True, help='Path to the input video file.')
    args = parser.parse_args()
    
    # Convert to absolute path
    video_path = os.path.abspath(args.video)
    
    success = analyze_video(video_path)
    
    if not success:
        exit(1)
