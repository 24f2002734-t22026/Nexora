import asyncio
import json
import os
import websockets

async def test_moonshine_websocket():
    uri = os.getenv("STT_WS_URI", "ws://127.0.0.1:8001/ws/transcribe")
    print(f"Connecting to WebSocket: {uri}...")
    
    async with websockets.connect(uri) as ws:
        # Receive connection ack
        init_resp = await ws.recv()
        print("Received from Server:", init_resp)

        # Path to sample audio file in moonshine assets
        sample_audio_path = os.path.expanduser(
            "/Users/pavanaksshay/nexora/stt_service/venv/lib/python3.12/site-packages/moonshine/assets/beckett.wav"
        )
        
        if not os.path.exists(sample_audio_path):
            print(f"Sample audio not found at {sample_audio_path}")
            return

        print(f"\nStreaming sample audio: {sample_audio_path} in chunks...")
        
        # Start session
        await ws.send(json.dumps({"action": "start"}))
        ack = await ws.recv()
        print("Server Ack:", ack)

        # Send binary chunks
        chunk_size = 4096
        with open(sample_audio_path, "rb") as f:
            while chunk := f.read(chunk_size):
                await ws.send(chunk)
                await asyncio.sleep(0.01)

        # Send flush/stop to get final transcript
        print("\nSending 'stop' action to finalize transcription...")
        await ws.send(json.dumps({"action": "stop"}))
        
        # Read incoming messages until final transcript is received
        while True:
            resp_str = await ws.recv()
            resp = json.loads(resp_str)
            print(f"[{resp.get('event', 'message')}] {resp}")
            if resp.get("event") == "final_transcript":
                print("\n=== FINAL TRANSCRIPT RECEIVED ===")
                print(f"Text: {resp.get('text')}")
                print(f"Model: {resp.get('model')}")
                print(f"Duration: {resp.get('duration_seconds')}s | Latency: {resp.get('latency_ms')}ms")
                print("=================================")
                break

if __name__ == "__main__":
    asyncio.run(test_moonshine_websocket())
