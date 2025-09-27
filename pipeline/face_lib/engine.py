import cv2
import numpy as np
import os
from insightface.app import FaceAnalysis
from sklearn.metrics.pairwise import cosine_similarity

class FaceRecognitionEngine:
    def __init__(self):
        """Initializes the FaceAnalysis model."""
        print("Loading InsightFace model... This may take a moment.")
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        self.app.prepare(ctx_id=0)
        print("Model loaded successfully.")

    def get_embedding(self, image, debug=False):
        """Generates a 512D embedding for a single face image."""
        if debug:
            print(f"    Input image shape: {image.shape if image is not None else 'None'}")
        
        if image is None:
            if debug:
                print("    Error: Input image is None")
            return None
            
        faces = self.app.get(image)
        if debug:
            print(f"    InsightFace detected {len(faces) if faces else 0} faces")
            
        if not faces:
            return None
        return faces[0].normed_embedding

    def prepare_known_database(self, known_faces_dir, output_db_dir):
        """Processes all images in the known_faces directory and saves averaged embeddings."""
        os.makedirs(output_db_dir, exist_ok=True)
        for person_name in os.listdir(known_faces_dir):
            person_path = os.path.join(known_faces_dir, person_name)
            if not os.path.isdir(person_path):
                continue

            print(f"[•] Processing {person_name}...")
            embeddings = []
            for img_name in os.listdir(person_path):
                img_path = os.path.join(person_path, img_name)
                img = cv2.imread(img_path)
                if img is None:
                    continue
                
                # Resize image for consistency before embedding
                img_resized = cv2.resize(img, (112, 112))
                emb = self.get_embedding(img_resized)
                if emb is not None:
                    embeddings.append(emb)
            
            if embeddings:
                avg_embedding = np.mean(embeddings, axis=0)
                out_path = os.path.join(output_db_dir, f"{person_name}.npy")
                np.save(out_path, avg_embedding)
                print(f"[+] Saved average embedding for {person_name}")
            else:
                print(f"[!] Skipped {person_name}: No valid faces found.")
        print("\n✅ Known faces database is up to date.")

    def detect_faces_and_embeddings(self, video_path):
        """Detects faces in a video and yields their embeddings directly."""
        # Validate video file exists
        if not os.path.exists(video_path):
            print(f"❌ Error: Video file does not exist: {video_path}")
            return
        
        # Check file extension
        valid_extensions = ('.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv')
        if not video_path.lower().endswith(valid_extensions):
            print(f"⚠️ Warning: File may not be a supported video format: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            print(f"❌ Error: Could not open video file: {video_path}")
            print("Possible issues: corrupted file, unsupported codec, or insufficient permissions")
            return

        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps <= 0:
            print("❌ Error: Could not determine video FPS")
            cap.release()
            return
            
        frame_interval = int(2 * fps) # Process every 5 seconds
        frame_count = 0
        
        try:
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_count % frame_interval == 0:
                    print(f"-> Scanning video at {frame_count / fps:.2f} seconds...")
                    try:
                        # Use InsightFace for both detection and cropping
                        faces = self.app.get(frame)
                        print(f"   InsightFace detected {len(faces) if faces else 0} face(s)")
                        
                        if faces:
                            for i, face in enumerate(faces):
                                # Get the bounding box for debugging
                                bbox = face.bbox.astype(int)
                                x1, y1, x2, y2 = bbox
                                print(f"   Face {i+1}: bbox=({x1},{y1},{x2},{y2})")
                                
                                # Directly yield the embedding from the detected face
                                if hasattr(face, 'normed_embedding') and face.normed_embedding is not None:
                                    print(f"   Face {i+1}: Got embedding directly from InsightFace")
                                    yield face.normed_embedding
                                else:
                                    print(f"   Face {i+1}: No embedding available")
                        else:
                            print(f"   No faces detected by InsightFace")
                    except Exception as e:
                        print(f"⚠️ Warning: Face detection failed at frame {frame_count}: {e}")
                        
                frame_count += 1
        finally:
            cap.release()

    def compare_embeddings(self, input_embedding, known_db_dir, threshold=0.6, debug=False):
        """Compares a single input embedding against the known database."""
        if not os.path.exists(known_db_dir) or not os.listdir(known_db_dir):
            return "Unknown", -1 # Return if database is empty

        best_match = "Unknown"
        best_score = -1
        all_scores = []

        for filename in os.listdir(known_db_dir):
            if filename.endswith('.npy'):
                known_name = os.path.splitext(filename)[0]
                known_emb = np.load(os.path.join(known_db_dir, filename))
                
                score = cosine_similarity([input_embedding], [known_emb])[0][0]
                all_scores.append((known_name, score))
                
                if debug:
                    print(f"    Similarity with {known_name}: {score:.4f}")
                
                if score > best_score:
                    best_score = score
                    best_match = known_name
        
        if debug:
            print(f"    Best match: {best_match} (score: {best_score:.4f}, threshold: {threshold})")
        
        if best_score >= threshold:
            return best_match, best_score
        else:
            return "Unknown", best_score
