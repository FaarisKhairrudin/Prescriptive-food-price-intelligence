import sys
from pathlib import Path

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from backend.pipeline.main_pipeline import run_narapangan_pipeline, build_web_payload, save_payload_to_cache

def main():
    print("[SCHEDULER] Starting background prediction update pipeline...")
    try:
        # 1. Run pipeline (Scrape PIHPS/NASA, run NBEATSx/NHITS models, write DB tables)
        pipeline_result = run_narapangan_pipeline(headless=True)
        
        # 2. Build web payload
        payload = build_web_payload(pipeline_result)
        
        # 3. Write payload cache to latest_payload.json
        save_payload_to_cache(payload)
        
        print("[SCHEDULER] Pipeline completed successfully. Cache is updated.")
        sys.exit(0)
    except Exception as e:
        print(f"[SCHEDULER] ERROR: Pipeline failed to run: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
