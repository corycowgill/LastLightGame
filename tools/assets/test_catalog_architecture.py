"""Actual generated surfaces must preserve the passage and hide the outside void."""
import unittest
from pathlib import Path
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[2]


def fitted_triangles(asset, dimensions):
    mesh = trimesh.load(ROOT/'public/models/catalog'/f'{asset}.glb',force='scene',process=False).to_geometry()
    lo, hi = mesh.bounds
    vertices = (mesh.vertices - [((lo+hi)/2)[0],lo[1],((lo+hi)/2)[2]]) * (np.array(dimensions)/(hi-lo))
    return vertices[mesh.faces]


def hit(triangles, origin, direction):
    origin, direction = np.array(origin), np.array(direction)
    edge1, edge2 = triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0]
    h = np.cross(np.broadcast_to(direction,edge2.shape),edge2)
    determinant = np.einsum('ij,ij->i',edge1,h)
    valid = np.abs(determinant)>1e-9
    inverse = np.zeros_like(determinant); inverse[valid]=1/determinant[valid]
    s=origin-triangles[:,0]; u=inverse*np.einsum('ij,ij->i',s,h)
    q=np.cross(s,edge1);v=inverse*(q@direction);t=inverse*np.einsum('ij,ij->i',edge2,q)
    return bool(np.any(valid & (u>=0) & (v>=0) & (u+v<=1) & (t>1e-6)))


class GeneratedArchitecture(unittest.TestCase):
    def test_arch_keeps_the_walking_lane_open(self):
        triangles=fitted_triangles('arc_arch_3m',[5.2,4.1,.55])
        for x in [-1,0,1]:
            for y in [.3,1.2,2.1]:
                self.assertFalse(hit(triangles,[x,y,-2],[0,0,1]),f'Arch blocks passage at {x},{y}')

    def test_wall_is_opaque_at_walking_height(self):
        triangles=fitted_triangles('arc_wall_2m',[2,4,.3])
        for y in [.4,1.5,2.8]: self.assertTrue(hit(triangles,[0,y,-2],[0,0,1]))

    def test_floor_has_a_visible_walkable_surface(self):
        triangles=fitted_triangles('arc_floor_2m',[2,.12,2])
        for x,z in [(-.5,-.5),(.5,-.5),(0,0),(-.5,.5),(.5,.5)]:
            self.assertTrue(hit(triangles,[x,1,z],[0,-1,0]),f'Missing floor at {x},{z}')


if __name__=='__main__': unittest.main()
