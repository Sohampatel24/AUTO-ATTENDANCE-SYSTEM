import os
import numpy as np
import cv2
import argparse
from face_lib.engine import FaceRecognitionEngine

def generate_embedding_for_person(input_dir, output_dir, person_name):
    """Generate embeddings for a person from their images.
    
    Args:
        input_dir: Directory containing images of the person
        output_dir: Directory to save the embedding file
        person_name: Name of the person (used for filename)
    """
    # Validate input directory exists
    if not os.path.exists(input_dir):
        print(f"❌ Input directory does not exist: {input_dir}")
        return False
    
    os.makedirs(output_dir, exist_ok=True)

    image_files = [f for f in os.listdir(input_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    if not image_files:
        print(f"❌ No image files found in: {input_dir}")
        return False

    print(f"🧠 Generating embeddings for person: {person_name}")
    print(f"📁 From directory: {input_dir}")
    print(f"💾 Saving to: {os.path.join(output_dir, person_name + '.npy')}")

    engine = FaceRecognitionEngine()
    embeddings = []

    for img_name in image_files:
        img_path = os.path.join(input_dir, img_name)
        print(f"  ➤ Processing {img_name}")

        try:
            img = cv2.imread(img_path)
            if img is None:
                print(f"  ❌ Could not read image: {img_path}")
                continue

            embedding = engine.get_embedding(img)
            if embedding is not None:
                embeddings.append(embedding)
            else:
                print(f"  ⚠️ No embedding returned for {img_name}")
        except Exception as e:
            print(f"  ❌ Error processing {img_name}: {e}")

    if embeddings:
        embeddings = np.stack(embeddings)
        avg_embedding = np.mean(embeddings, axis=0)

        out_path = os.path.join(output_dir, f"{person_name}.npy")
        np.save(out_path, avg_embedding)
        print(f"\n✅ Saved average embedding to: {out_path}")
        return True
    else:
        print("❌ No valid embeddings generated.")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate face embeddings for a person from their images.")
    parser.add_argument('--person', type=str, required=True, help='Name of the person (will be used as filename)')
    parser.add_argument('--input_dir', type=str, required=True, help='Directory containing images of the person')
    parser.add_argument('--output_dir', type=str, default='data/output/embeddings/known_db', 
                       help='Directory to save the embedding file (default: data/output/embeddings/known_db)')
    
    args = parser.parse_args()
    
    # Convert relative paths to absolute paths
    input_dir = os.path.abspath(args.input_dir)
    output_dir = os.path.abspath(args.output_dir)
    
    success = generate_embedding_for_person(input_dir, output_dir, args.person)
    
    if success:
        print(f"\n✅ Successfully enrolled {args.person}!")
    else:
        print(f"\n❌ Failed to enroll {args.person}.")
        exit(1)
