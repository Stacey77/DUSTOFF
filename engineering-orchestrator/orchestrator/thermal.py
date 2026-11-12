"""Thermal agent solver layer 2: steady-state board heat spreading by finite elements (scikit-fem).

Model: the board is a thin plate. In-plane conduction through copper and FR4, convection from both faces,
heat injected at component footprints:
    -div(kt grad T) + 2h (T - Ta) = q
kt = sum of layer conductivity x thickness (W/K). Solved on a triangle mesh with P1 elements.
Elmer is the production target for this layer; this solver has the same inputs and outputs.
"""
import numpy as np
from skfem import MeshTri, Basis, ElementTriP1, BilinearForm, LinearForm, solve
from skfem.helpers import dot, grad

K_CU, K_FR4 = 385.0, 0.3            # W/mK
T_CU_1OZ, T_BOARD = 35e-6, 1.6e-3   # m


def sheet_conductance(copper_pour):
    coverage = 1.0 if copper_pour else 0.2   # fraction of each layer covered by copper, 2 layers
    return 2 * coverage * K_CU * T_CU_1OZ + K_FR4 * T_BOARD


def solve_board(width_mm, height_mm, sources, t_ambient, copper_pour, h=10.0, refine=6):
    """sources: list of dicts {name, x_mm, y_mm, w_mm, h_mm, watts}. Returns per-source peak temperature."""
    W, H = width_mm / 1000, height_mm / 1000
    mesh = MeshTri.init_tensor(np.linspace(0, W, 2 ** refine + 1), np.linspace(0, H, 2 ** refine + 1))
    basis = Basis(mesh, ElementTriP1())
    kt = sheet_conductance(copper_pour)

    def q_field(x, y):
        q = np.zeros_like(x)
        for s in sources:
            cx, cy, sw, sh = s["x_mm"] / 1000, s["y_mm"] / 1000, s["w_mm"] / 1000, s["h_mm"] / 1000
            inside = (abs(x - cx) <= sw / 2) & (abs(y - cy) <= sh / 2)
            q = q + np.where(inside, s["watts"] / (sw * sh), 0.0)
        return q

    @BilinearForm
    def a(u, v, w):
        return kt * dot(grad(u), grad(v)) + 2 * h * u * v

    @LinearForm
    def l(v, w):
        return q_field(w.x[0], w.x[1]) * v

    A, b = a.assemble(basis), l.assemble(basis)
    rise = solve(A, b)
    # correct for footprint power lost to coarse quadrature: rescale so injected power matches exactly
    injected = float(np.sum(b))
    total = sum(s["watts"] for s in sources)
    if injected > 0:
        rise *= total / injected
    pts = mesh.p
    result = {"kt": kt, "max_rise": float(rise.max()), "sources": {}}
    for s in sources:
        cx, cy = s["x_mm"] / 1000, s["y_mm"] / 1000
        near = (abs(pts[0] - cx) <= s["w_mm"] / 2000 + 1e-9) & (abs(pts[1] - cy) <= s["h_mm"] / 2000 + 1e-9)
        result["sources"][s["name"]] = t_ambient + float(rise[near].max())
    result["grid"] = (pts, rise + t_ambient, mesh.t)
    return result


def validate(width_mm=50, height_mm=50, watts=1.0, h=10.0):
    """Uniform heating over the whole board must give rise = P / (2 h A) everywhere."""
    res = solve_board(width_mm, height_mm, [{"name": "all", "x_mm": width_mm / 2, "y_mm": height_mm / 2,
                                              "w_mm": width_mm, "h_mm": height_mm, "watts": watts}],
                      0.0, True, h=h)
    expected = watts / (2 * h * width_mm * height_mm * 1e-6)
    return res["max_rise"], expected
