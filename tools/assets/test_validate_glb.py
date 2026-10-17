import json
import struct
import tempfile
import unittest
from pathlib import Path
from validate_glb import inspect, CLIPS


class CharacterGateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        (Path(__file__).resolve().parents[2] / ".asset-tools").mkdir(exist_ok=True)

    def write(self, folder, doc):
        data = json.dumps(doc).encode()
        data += b" " * (-len(data) % 4)
        path = Path(folder) / "fixture.glb"
        path.write_bytes(struct.pack("<4sIIII", b"glTF", 2, 20 + len(data), len(data), 0x4E4F534A) + data)
        return path

    def test_missing_rig_and_clips_rejected(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[2] / ".asset-tools") as folder:
            errors = inspect(self.write(folder, {}), "torchbearer")
            self.assertTrue(any("skeleton" in e for e in errors))
            self.assertTrue(any("clips" in e for e in errors))

    def test_packaging_gate_and_external_resources(self):
        # Structural fixture only: this does not claim to be a renderable asset.
        doc = {"skins": [{"joints": [0]}], "nodes": [{"skin": 0, "mesh": 0}],
               "meshes": [{"primitives": [{"attributes": {"JOINTS_0": 0, "WEIGHTS_0": 1}}]}],
               "animations": [{"name": n, "channels": [{}], "samplers": [{}]} for n in CLIPS["hunter"]]}
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[2] / ".asset-tools") as folder:
            self.assertEqual(inspect(self.write(folder, doc), "hunter"), [])
            doc["images"] = [{"uri": "texture.png"}]
            self.assertTrue(any("external" in e for e in inspect(self.write(folder, doc), "hunter")))
            doc["skins"][0]["joints"] = list(range(97))
            self.assertTrue(any("96" in e for e in inspect(self.write(folder, doc), "hunter")))

    def test_truncated_file_rejected(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parents[2] / ".asset-tools") as folder:
            p = Path(folder) / "broken.glb"
            p.write_bytes(b"glTF")
            with self.assertRaises(ValueError):
                inspect(p, "hunter")


if __name__ == "__main__":
    unittest.main()
