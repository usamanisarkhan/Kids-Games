# 🕹️ Gemini Balloon Popper: The Vision-Coded Game

**A Proof-of-Concept for Sub-100ms Real-Time Interaction using the Gemini 3 Pro Multimodal Live API.**

> "We're transforming a video stream into a high-speed, cloud-hosted game controller."

## 📖 Project Concept: Vibe Coding in Action
**Gemini Balloon Popper** is an application built to explore the cutting edge of **Vision-Coded Gaming**. The goal was to prove that a multimodal AI model could run a complex, real-time game loop while achieving **sub-100ms perceived latency**.

This project demonstrates the principle of **Vibe Coding**—using natural language and visual cues to create applications that are instantaneously responsive to user input (in this case, physical movement).

## 💡 Technical Deep Dive: Achieving Low Latency

The core challenge was to overcome network and inference overhead. The solution relies on aggressively optimizing the **Gemini 3 Pro** API request to ensure the time-to-first-token (TTFT) for critical structured data is minimized.

### Key Optimization Strategies:

1.  **Gemini Multimodal Live API:** Used for continuous, low-latency streaming of video frames directly to the model.
2.  **Thinking Level Control:** The API call explicitly sets **`thinking_level: low`**. This instructs the model to prioritize speed and structural output over deep reasoning, drastically reducing internal inference time for high-speed pose estimation.
3.  **Low Media Resolution:** The prompt specifies **`media_resolution: low`** for the video input. This reduces the number of tokens required per frame, maximizing the frames-per-second (fps) throughput necessary for fluid gaming.
4.  **Structured JSON Output:** The model is constrained to generate only a **structured JSON object** containing the `x/y` coordinates of the target limbs (hands and feet). This minimizes unnecessary linguistic output, ensuring the game engine receives clean, predictable data for immediate hitbox calculation.

## ✨ Features
* **Real-Time Pose Estimation:** Uses the VLM to track specific body joints (hands and feet) for accurate interaction.
* **Sub-100ms Action Loop:** Achieves perceived real-time responsiveness by aggressively optimizing the VLM inference pipeline.
* **Dynamic Hitbox Correlation:** Calculates the collision between the inferred limb coordinates and the virtual balloon coordinates server-side.
* **Immediate Visual Feedback:** Triggers "POW!" and score updates instantaneously upon detection.

## 🎥 Demo
[https://www.linkedin.com/posts/usama-nisar_gemini3pro-gemini-gemini3pro-activity-7398322136408428544-g9kR?utm_source=share&utm_medium=member_desktop&rcm=ACoAABTaY3MB43v_1QvvzsfUqKAgV3BeoFe5HAg]
*Watch the live action demo showing the near-instantaneous response time.*

## 📦 Installation & Usage


1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/yourusername/gemini-balloon-popper.git](https://github.com/yourusername/gemini-balloon-popper.git)
    ```
2.  **Set Environment Variable:**
    ```bash
    export GEMINI_API_KEY="your_api_key_here"
    ```
3.  **Run the Server:**
    ```bash
    # [Insert your specific run command, e.g., python server.py or npm run start]
    ```

***
