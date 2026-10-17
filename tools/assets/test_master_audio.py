import unittest
import numpy as np
from master_audio import prepare


class MasterAudioTests(unittest.TestCase):
    def test_silence_and_invalid_generation_rejected(self):
        for data in [np.zeros(32000), np.full(32000, np.nan), np.ones(100)]:
            with self.assertRaises(ValueError):
                prepare(data, 16000)

    def test_bounds_and_loop_crossfade(self):
        sr = 16000
        data = np.sin(np.arange(sr * 3) * 0.08) * 5 + 0.4
        out = prepare(data, sr, loop=True, music=True)
        self.assertEqual(out.shape, (36000, 1))
        self.assertLessEqual(abs(out).max(), 0.701)
        self.assertLess(abs(out[-1, 0]-out[0, 0]), 0.02)


if __name__ == "__main__":
    unittest.main()

