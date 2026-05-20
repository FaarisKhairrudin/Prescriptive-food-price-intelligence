from backend.pipeline.main_pipeline import *  # noqa: F401,F403


if __name__ == "__main__":
    result = run_narapangan_pipeline(headless=True)  # noqa: F405
    payload = build_web_payload(result)  # noqa: F405

    print("\n=== PROCUREMENT SIGNAL ===")
    for key, value in payload["summary"].items():
        print(f"{key}: {value}")

    print("\n=== FORECAST ===")
    for row in payload["forecast"]:
        print(row)
