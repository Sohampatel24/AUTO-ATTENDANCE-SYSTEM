# Video Face Recognition Pipeline

This project provides a simple, two-script system to recognize people in videos. It uses the powerful `insightface` library for high-accuracy face recognition.

## Setup

1.  **Clone the repository and navigate into it.**

2.  **Create a virtual environment (recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

3.  **Install requirements:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Create data directories:**
    ```bash
    mkdir -p data/videos
    ```

## Usage

The process is just two simple steps.

### Step 1: Enroll Known Faces

To add people to your recognition database, use the `enroll.py` script with command-line arguments.

1.  **Create a directory for the person** and add their photos:
    ```bash
    mkdir -p data/known_faces/john_doe
    # Add several clear photos of john_doe to this folder
    ```

2.  **Run the enrollment script:**
    ```bash
    python3 enroll.py --person johndoe --input_dir data/known_faces/johndoe
    ```
 
    **Options:**
    - `--person`: Name of the person (will be used as the filename)
    - `--input_dir`: Directory containing images of the person
    - `--output_dir`: Where to save the embedding (optional, defaults to `data/output/embeddings/known_db`)

3.  **Example for multiple people:**
    ```bash
    python3 enroll.py --person alice --input_dir data/known_faces/alice
    python3 enroll.py --person bob --input_dir data/known_faces/bob
    ```

Repeat this process for every person you want to be able to recognize.

### Step 2: Analyze a Video

Once your database is ready, you can analyze any video with a single command.

1.  Place your video file anywhere accessible (e.g., `data/videos/` directory).
2.  **Run the pipeline:**
    ```bash
    python3 run_pipeline.py --video data/videos/my_test_video.mp4
    ```

    **Options:**
    - `--video`: Path to the video file to analyze

The script will scan the video, detect faces, and print the names of any recognized individuals it finds.

## Troubleshooting

### Common Issues

1. **"No known faces database found"**
   - Make sure you've run `enroll.py` first to create the face database
   - Check that the database directory exists: `data/output/embeddings/known_db`

2. **"Video file does not exist"**
   - Verify the video file path is correct
   - Use absolute paths if having issues with relative paths

3. **"Could not open video file"**
   - Check if the video format is supported (.mp4, .avi, .mov, .mkv, .flv, .wmv)
   - Verify the video file is not corrupted
   - Ensure you have proper file permissions

4. **Low recognition accuracy**
   - Add more high-quality photos of each person (at least 5-10 images)
   - Use clear, well-lit photos with the person facing the camera
   - Avoid blurry or low-resolution images

5. **"Could not determine video FPS"**
   - The video file might be corrupted or have an unusual format
   - Try converting the video to a standard format like MP4

### Performance Tips

- For faster processing, use videos with lower resolution
- The system processes frames every 5 seconds by default
- Ensure good lighting and clear faces in your training images for better accuracy
