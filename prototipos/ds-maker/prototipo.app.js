/* ─────────────────────────────────────────────────────────────────────────────
   DS Maker — código de aplicación del prototipo de Alberto.

   NO ES CÓDIGO DE ESTE REPO Y NO SE IMPORTA DESDE NINGUNA PARTE. Es material de
   referencia para implementar DSMak_r (ver docs/features/ds-mak-r.md).

   Procedencia: el HTML autocontenido del prototipo trae React, react-dom y los
   iconos empaquetados y minificados por esbuild. Aquí está solo la parte de
   aplicación, formateada. Los nombres de variable son los que dejó el
   minificador: ilegibles, pero estables.

   Mapa de lo que importa, con la línea de este archivo:

     x2       425  hoja de estilos del prototipo. SE DESCARTA: reescribe a mano una paleta parecida a la de marca
     Ml       790  conversión a OKLCH
     sa       813  vuelta desde OKLCH
     Ka       853  ratio de contraste WCAG y nivel AA/AAA
     Pa       867  construcción de una rampa 50→900 desde un color
     ec       904  rampa de neutros según el preset
     zf       936  colores semánticos por desplazamiento de tono (success 152 · warning 88 · error 27 · info 254)
     wf      1277  parámetros de marca por defecto
     L0      1309  EL MOTOR: parámetros de marca → tokens completos
     Rl      1385  superficies resueltas para claro y oscuro
     A2      1406  tokens → JSON de exportación
     $u      1479  URL de Google Fonts a partir de las familias
     F0      1486  tokens → bloques CSS
     Af      1525  hoja CSS completa
     ja      1536  tokens resueltos para previsualizar
     Tn      2860  catálogo de los 17 componentes con sus ejes
     to      3303  configuración por defecto de un componente
     G0      3377  panel de sistemas (semilla falsa, se descarta)
     Z0      3771  paso 1, parámetros de marca
     Q0      4503  paso 2, fundamentos
     V0      5848  paso 3, componentes
     x3      6317  generación del styleguide HTML
     py      6452  paso 4, entrega
     X6      6963  semilla falsa del panel. SE DESCARTA
     Sy      7019  componente raíz: los cuatro pasos y el estado

   Lo que NO se porta: la persistencia (no hay), el enlace de compartir (un
   blob: local), la barra de progreso de 1,5 s (el cálculo es instantáneo), la
   mezcla de inglés y castellano, y la hoja de estilos x2.
   ───────────────────────────────────────────────────────────────────────── */

    function v2({
        size: t = 34
    }) {
        return (0, z.jsxs)("svg", {
            width: t,
            height: t,
            viewBox: "0 0 32 32",
            className: "brand-mark",
            "aria-hidden": "true",
            children: [(0, z.jsx)("rect", {
                width: "32",
                height: "32",
                fill: "#1A1815"
            }), (0, z.jsx)("rect", {
                x: "4",
                y: "4",
                width: "8",
                height: "8",
                fill: "#fff"
            }), (0, z.jsx)("rect", {
                x: "20",
                y: "12",
                width: "8",
                height: "8",
                fill: "#fff"
            }), (0, z.jsx)("rect", {
                x: "12",
                y: "20",
                width: "8",
                height: "8",
                fill: "#fff"
            })]
        })
    }
    var Ot = ({
        label: t,
        hint: e,
        children: n,
        style: l
    }) => (0, z.jsxs)("div", {
        className: "field",
        style: l,
        children: [t && (0, z.jsx)("span", {
            className: "lbl",
            children: t
        }), n, e && (0, z.jsx)("span", {
            className: "tiny muted",
            children: e
        })]
    });

    function ee({
        value: t,
        onChange: e,
        options: n,
        ...l
    }) {
        return (0, z.jsx)("select", {
            className: "select",
            value: t,
            onChange: a => e(a.target.value),
            ...l,
            children: n.map(a => {
                let i = typeof a == "object" ? a.value : a,
                    u = typeof a == "object" ? a.label : a;
                return (0, z.jsx)("option", {
                    value: i,
                    children: u
                }, String(i))
            })
        })
    }
    var Gn = ({
        value: t,
        onChange: e,
        options: n,
        small: l
    }) => (0, z.jsx)("div", {
        className: "seg" + (l ? " seg-sm" : ""),
        role: "tablist",
        children: n.map(a => {
            let i = typeof a == "object" ? a.value : a,
                u = typeof a == "object" ? a.label : a,
                o = typeof a == "object" ? a.icon : null;
            return (0, z.jsxs)("button", {
                role: "tab",
                "aria-selected": i === t,
                className: i === t ? "on" : "",
                onClick: () => e(i),
                type: "button",
                children: [o, u]
            }, String(i))
        })
    });
    var Ku = ({
        checked: t,
        onChange: e,
        label: n,
        hint: l
    }) => (0, z.jsxs)("label", {
        className: "chk",
        children: [(0, z.jsx)("input", {
            type: "checkbox",
            checked: !!t,
            onChange: a => e(a.target.checked)
        }), (0, z.jsx)("span", {
            className: "chk-box",
            children: (0, z.jsx)(X.Check, {
                size: 11,
                w: 3
            })
        }), (0, z.jsxs)("span", {
            children: [(0, z.jsx)("span", {
                style: {
                    fontSize: 13
                },
                children: n
            }), l && (0, z.jsx)("span", {
                className: "tiny muted",
                style: {
                    display: "block"
                },
                children: l
            })]
        })]
    });

    function Vt({
        value: t,
        onChange: e,
        suffix: n,
        width: l = 74,
        min: a,
        max: i,
        step: u = 1
    }) {
        return (0, z.jsxs)("span", {
            className: "row gap6",
            children: [(0, z.jsx)("input", {
                className: "input input-sm mono-num",
                style: {
                    width: l
                },
                type: "number",
                value: t,
                min: a,
                max: i,
                step: u,
                onChange: o => e(o.target.value === "" ? "" : Number(o.target.value))
            }), n && (0, z.jsx)("span", {
                className: "tiny muted",
                children: n
            })]
        })
    }

    function ra({
        value: t,
        onChange: e,
        width: n = "100%"
    }) {
        let [l, a] = (0, oa.useState)(t);
        return (0, oa.useEffect)(() => a(t), [t]), (0, z.jsxs)("div", {
            className: "row gap6 input",
            style: {
                width: n,
                padding: "0 6px",
                minWidth: 0
            },
            children: [(0, z.jsxs)("label", {
                style: {
                    position: "relative",
                    width: 20,
                    height: 20,
                    flexShrink: 0,
                    cursor: "pointer"
                },
                children: [(0, z.jsx)("span", {
                    style: {
                        display: "block",
                        width: 20,
                        height: 20,
                        borderRadius: 99,
                        background: t,
                        border: "1px solid rgba(0,0,0,.15)"
                    }
                }), (0, z.jsx)("input", {
                    type: "color",
                    value: /^#[0-9a-f]{6}$/i.test(t) ? t : "#000000",
                    onChange: i => e(i.target.value.toUpperCase()),
                    style: {
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: "pointer",
                        width: "100%",
                        height: "100%"
                    }
                })]
            }), (0, z.jsx)("input", {
                value: l,
                spellCheck: !1,
                onChange: i => {
                    a(i.target.value), /^#?[0-9a-f]{6}$/i.test(i.target.value) && e((i.target.value.startsWith("#") ? i.target.value : "#" + i.target.value).toUpperCase())
                },
                onBlur: () => a(t),
                style: {
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    width: "100%",
                    minWidth: 0,
                    fontSize: 12,
                    padding: 0
                }
            })]
        })
    }

    function y2({
        open: t,
        title: e,
        subtitle: n,
        onClose: l,
        children: a,
        footer: i,
        width: u
    }) {
        return (0, oa.useEffect)(() => {
            if (!t) return;
            let o = r => {
                r.key === "Escape" && l()
            };
            return document.addEventListener("keydown", o), () => document.removeEventListener("keydown", o)
        }, [t, l]), t ? (0, z.jsxs)(z.Fragment, {
            children: [(0, z.jsx)("div", {
                className: "scrim",
                onClick: l
            }), (0, z.jsxs)("aside", {
                className: "drawer",
                style: u ? {
                    width: u
                } : void 0,
                role: "dialog",
                "aria-modal": "true",
                "aria-label": e,
                children: [(0, z.jsxs)("div", {
                    className: "drawer-head",
                    children: [(0, z.jsxs)("div", {
                        children: [(0, z.jsx)("h2", {
                            className: "sec-title",
                            children: e
                        }), n && (0, z.jsx)("p", {
                            className: "tiny muted",
                            style: {
                                margin: "4px 0 0"
                            },
                            children: n
                        })]
                    }), (0, z.jsx)("button", {
                        className: "icon-btn",
                        onClick: l,
                        "aria-label": "Cerrar",
                        children: (0, z.jsx)(X.Close, {
                            size: 18
                        })
                    })]
                }), (0, z.jsx)("div", {
                    className: "drawer-body",
                    children: a
                }), i && (0, z.jsx)("div", {
                    className: "drawer-foot",
                    children: i
                })]
            })]
        }) : null
    }

    function b2() {
        let [t, e] = (0, oa.useState)(null), n = (0, oa.useRef)(null);
        return (0, oa.useEffect)(() => {
            let l = a => {
                n.current && !n.current.contains(a.target) && e(null)
            };
            return document.addEventListener("mousedown", l), () => document.removeEventListener("mousedown", l)
        }, []), {
            open: t,
            setOpen: e,
            ref: n
        }
    }
    var ca = ({
        title: t,
        editing: e,
        onEdit: n,
        onClose: l,
        children: a,
        footer: i,
        right: u
    }) => (0, z.jsxs)("section", {
        className: "sec",
        children: [(0, z.jsxs)("header", {
            className: "sec-head",
            children: [(0, z.jsx)("h2", {
                className: "sec-title",
                children: t
            }), (0, z.jsxs)("div", {
                className: "row gap8",
                children: [u, e ? (0, z.jsx)("button", {
                    className: "icon-btn",
                    onClick: l,
                    "aria-label": "Cerrar edici\xF3n",
                    children: (0, z.jsx)(X.Close, {
                        size: 17
                    })
                }) : (0, z.jsx)("button", {
                    className: "icon-btn",
                    onClick: n,
                    "aria-label": "Editar " + t,
                    children: (0, z.jsx)(X.Pencil, {
                        size: 16
                    })
                })]
            })]
        }), (0, z.jsx)("div", {
            className: "sec-body",
            children: a
        }), i && (0, z.jsx)("div", {
            className: "sec-foot",
            children: i
        })]
    });

    function m2({
        msg: t
    }) {
        return t ? (0, z.jsx)("div", {
            className: "toast",
            children: t
        }) : null
    }
    var _0 = t => {
        let e = (Date.now() - new Date(t).getTime()) / 1e3,
            n = [
                [31536e3, "a\xF1o"],
                [2592e3, "mes"],
                [604800, "semana"],
                [86400, "d\xEDa"],
                [3600, "hora"],
                [60, "minuto"]
            ];
        for (let [l, a] of n)
            if (e >= l) {
                let i = Math.floor(e / l);
                return `hace ${i} ${a}${i>1?a==="mes"?"es":"s":""}`
            } return "hace un momento"
    };

    function Sf(t, e, n = "application/json") {
        let l = new Blob([e], {
                type: n
            }),
            a = URL.createObjectURL(l),
            i = document.createElement("a");
        i.href = a, i.download = t, document.body.appendChild(i), i.click(), document.body.removeChild(i), setTimeout(() => URL.revokeObjectURL(a), 800)
    }
    async function p2(t) {
        try {
            if (navigator.clipboard && window.isSecureContext) return await navigator.clipboard.writeText(t), !0
        } catch {}
        let e = document.createElement("textarea");
        e.value = t, e.style.position = "fixed", e.style.opacity = "0", document.body.appendChild(e), e.select();
        let n = !1;
        try {
            n = document.execCommand("copy")
        } catch {
            n = !1
        }
        return document.body.removeChild(e), n
    }
    var x2 = String.raw`
/* =========================================================================
   DS Maker — chrome de la aplicación (IBM Plex Serif + IBM Plex Mono)
   ========================================================================= */
:root{
  --paper:#F4F1EA; --paper-2:#EFEBE3; --paper-3:#F2F0F1;
  --surface:#FFFFFF; --surface-2:#FAF8F4;
  --ink:#26241F; --ink-2:#46433F; --ink-3:#75716C; --ink-4:#9C978F;
  --line:#E4DFD5; --line-2:#D3CCBF; --black:#1A1815;
  --focus:#46433F;
  --serif:"IBM Plex Serif",Georgia,serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  --r:3px;
}
*,*::before,*::after{box-sizing:border-box}
html,body,#root{height:100%}
body{
  margin:0;background:var(--paper);color:var(--ink);
  font-family:var(--mono);font-size:13px;line-height:1.55;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:none;padding:0}
a{color:inherit}
::selection{background:#DED7C8}

/* ---------- modo oscuro de la superficie de trabajo ---------- */
.mode-dark{
  --paper:#1B1917; --paper-2:#242220; --paper-3:#211F1D;
  --surface:#141312; --surface-2:#1C1B19;
  --ink:#F4F1EA; --ink-2:#E6E1D8; --ink-3:#9A948B; --ink-4:#736E66;
  --line:#312E2A; --line-2:#413D37; --black:#F0EDE6;
  --focus:#E6E1D8;
  background:var(--paper);color:var(--ink);
}
.mode-dark .btn-primary{background:#F0EDE6;color:#1B1917}
.mode-dark .btn-primary:hover{background:#fff}
.mode-dark .seg button.on,.mode-dark .chip.on{background:#E6E1D8;color:#1B1917;border-color:#E6E1D8}
.mode-dark .tab.on{border-bottom-color:#E6E1D8}
.mode-dark .card-opt.on{box-shadow:inset 0 0 0 1px var(--ink-2)}
.mode-dark .badge-aa{background:#203024;color:#8FD3A3}
.mode-dark .badge-aa.aaa{background:#1D3326;color:#A6E0B6}
.mode-dark .badge-aa.fail{background:#3A2320;color:#EDA093}
.mode-dark .swatch{border-color:rgba(255,255,255,.12)}
.mode-dark .grid-col{background:#26383C;border-color:#33484D}
.mode-dark input[type=range]{accent-color:#E6E1D8}
.mode-dark ::-webkit-scrollbar-thumb{border-color:var(--paper)}

/* ---------- scrollbars ---------- */
::-webkit-scrollbar{width:10px;height:10px}
::-webkit-scrollbar-thumb{background:var(--line-2);border:3px solid var(--paper);border-radius:99px}
::-webkit-scrollbar-track{background:transparent}

/* ---------- tipografía ---------- */
.serif{font-family:var(--serif);font-weight:400;letter-spacing:-.02em;color:var(--ink-2)}
h1.page-title{font-family:var(--serif);font-size:44px;line-height:1.1;letter-spacing:-.03em;margin:0;font-weight:400;color:var(--ink-2)}
h2.sec-title{font-family:var(--serif);font-size:24px;line-height:1.2;letter-spacing:-.02em;margin:0;font-weight:400;color:var(--ink-2)}
.page-sub{color:var(--ink-3);font-size:13px;margin:6px 0 0}
.lbl{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.lbl-strong{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink);font-weight:600}
.muted{color:var(--ink-3)}
.tiny{font-size:11px}
.mono-num{font-variant-numeric:tabular-nums}

/* ---------- layout ---------- */
.app{min-height:100%;display:flex;flex-direction:column}
.wrap{max-width:1360px;margin:0 auto;padding:0 40px;width:100%}
.wrap-narrow{max-width:1000px;margin:0 auto;padding:0 40px;width:100%}
.scroller{flex:1;overflow-y:auto;overflow-x:hidden}
.stack{display:flex;flex-direction:column}
.row{display:flex;align-items:center}
.between{display:flex;align-items:center;justify-content:space-between}
.grow{flex:1}
.gap4{gap:4px}.gap6{gap:6px}.gap8{gap:8px}.gap10{gap:10px}.gap12{gap:12px}
.gap16{gap:16px}.gap20{gap:20px}.gap24{gap:24px}.gap32{gap:32px}
.wrapf{flex-wrap:wrap}

/* ---------- header ---------- */
.topbar{
  position:sticky;top:0;z-index:40;background:var(--paper);
  border-bottom:1px solid var(--line);
}
.topbar-in{height:72px;display:flex;align-items:center;gap:24px;max-width:1440px;margin:0 auto;padding:0 40px}
.brand{display:flex;align-items:center;gap:10px;flex-shrink:0}
.brand-mark{width:34px;height:34px;flex-shrink:0}
.brand-name{font-family:var(--mono);font-size:19px;font-weight:600;letter-spacing:-.01em;color:var(--ink)}
.brand-name b{font-weight:400}

/* ---------- stepper ---------- */
.stepper{display:flex;align-items:center;gap:10px;margin:0 auto}
.step-item{display:flex;align-items:center;gap:8px;background:none;border:none;padding:2px 4px;border-radius:var(--r)}
.step-item:disabled{cursor:default}
.step-badge{
  width:22px;height:22px;border-radius:99px;display:grid;place-items:center;
  font-size:11px;font-weight:600;background:var(--paper-2);color:var(--ink-3);
  border:1px solid var(--line-2);flex-shrink:0;transition:.15s;
}
.step-item.on .step-badge{background:var(--black);color:#fff;border-color:var(--black)}
.step-item.done .step-badge{background:var(--ink-3);color:#fff;border-color:var(--ink-3)}
.step-lbl{font-size:13px;color:var(--ink-3);white-space:nowrap}
.step-item.on .step-lbl{color:var(--ink);font-weight:500}
.step-item:not(:disabled):hover .step-lbl{color:var(--ink)}
.step-arrow{color:var(--ink-4);display:flex}

/* ---------- botones ---------- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  height:38px;padding:0 16px;border-radius:var(--r);font-size:13px;
  border:1px solid transparent;transition:.14s;white-space:nowrap;
}
.btn:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.btn-primary{background:var(--black);color:#fff}
.btn-primary:hover{background:#000}
.btn-primary:disabled{background:var(--line-2);color:var(--surface);cursor:not-allowed}
.btn-secondary{background:var(--surface);color:var(--ink);border-color:var(--line-2)}
.btn-secondary:hover{border-color:var(--ink-3)}
.btn-ghost{background:transparent;color:var(--ink-2)}
.btn-ghost:hover{background:var(--paper-2)}
.btn-sm{height:30px;padding:0 10px;font-size:12px}
.btn-danger{color:#B4392F}
.link-btn{background:none;border:none;text-decoration:underline;text-underline-offset:3px;font-size:13px;color:var(--ink-2)}
.link-btn:hover{color:var(--ink)}
.icon-btn{width:30px;height:30px;border-radius:var(--r);display:grid;place-items:center;color:var(--ink-3)}
.icon-btn:hover{background:var(--paper-2);color:var(--ink)}

/* ---------- inputs ---------- */
.input,.select,.textarea{
  width:100%;height:38px;padding:0 12px;background:var(--surface);
  border:1px solid var(--line-2);border-radius:var(--r);font-size:13px;
  color:var(--ink);transition:.14s;
}
.textarea{height:auto;padding:9px 12px;line-height:1.5;resize:vertical;font-family:var(--mono)}
.input::placeholder,.textarea::placeholder{color:var(--ink-4)}
.input:focus,.select:focus,.textarea:focus{outline:none;border-color:var(--ink-2);box-shadow:0 0 0 3px rgba(70,67,63,.09)}
.input-sm{height:30px;font-size:12px;padding:0 8px}
.select{appearance:none;padding-right:30px;cursor:pointer;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2375716c' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat:no-repeat;background-position:right 10px center}
.field{display:flex;flex-direction:column;gap:6px}
.field-row{display:grid;gap:20px}

/* checkbox propio */
.chk{display:inline-flex;align-items:flex-start;gap:9px;cursor:pointer}
.chk input{position:absolute;opacity:0;width:0;height:0}
.chk-box{
  width:16px;height:16px;border:1px solid var(--ink-3);border-radius:2px;background:var(--surface);
  display:grid;place-items:center;flex-shrink:0;margin-top:2px;transition:.12s;
}
.chk input:checked + .chk-box{background:var(--black);border-color:var(--black)}
.chk input:focus-visible + .chk-box{box-shadow:0 0 0 3px rgba(70,67,63,.15)}
.chk-box svg{opacity:0;color:#fff}
.chk input:checked + .chk-box svg{opacity:1}

/* segmented */
.seg{display:flex;border:1px solid var(--line-2);border-radius:var(--r);overflow:hidden;background:var(--surface)}
.seg button{
  flex:1;height:38px;padding:0 14px;font-size:13px;color:var(--ink-2);
  border-right:1px solid var(--line-2);display:flex;align-items:center;justify-content:center;gap:7px;transition:.12s;
  white-space:nowrap;
}
.seg button:last-child{border-right:none}
.seg button:hover{background:var(--paper-2)}
.seg button.on{background:var(--ink-2);color:#fff}
.seg button.on:hover{background:var(--ink)}
.seg-sm button{height:28px;font-size:11.5px;padding:0 10px}

/* chips / tabs */
.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{
  height:28px;padding:0 11px;border:1px solid var(--line-2);border-radius:99px;
  background:var(--surface);font-size:12px;color:var(--ink-2);display:inline-flex;align-items:center;gap:6px;transition:.12s;
}
.chip:hover{border-color:var(--ink-3)}
.chip.on{background:var(--black);border-color:var(--black);color:#fff}
.tabs{display:flex;gap:0;border-bottom:1px solid var(--line)}
.tab{padding:9px 14px;font-size:12px;color:var(--ink-3);border-bottom:2px solid transparent;margin-bottom:-1px}
.tab:hover{color:var(--ink)}
.tab.on{color:var(--ink);border-bottom-color:var(--black);font-weight:500}

/* radio-card (ratio, radius style, shadow) */
.card-opts{display:grid;gap:10px}
.card-opt{
  text-align:left;border:1px solid var(--line-2);background:var(--surface);border-radius:var(--r);
  padding:12px;transition:.14s;position:relative;display:flex;flex-direction:column;gap:8px;
}
.card-opt:hover{border-color:var(--ink-3)}
.card-opt.on{border-color:var(--ink-2);box-shadow:inset 0 0 0 1px var(--ink-2)}
.card-opt .dot{width:12px;height:12px;border-radius:99px;border:1px solid var(--line-2);flex-shrink:0}
.card-opt.on .dot{border-color:var(--ink-2);background:var(--ink-2);box-shadow:inset 0 0 0 2px var(--surface)}

/* ---------- superficies ---------- */
.card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r)}
.panel{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:24px 28px}
.sec{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);margin-bottom:20px}
.sec-head{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid var(--line)}
.sec-body{padding:20px 24px 24px}
.sec-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px;border-top:1px solid var(--line);background:var(--surface-2)}
.divider{height:1px;background:var(--line);border:0;margin:0}
.group-label{
  display:flex;align-items:center;gap:12px;font-size:11px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--ink-3);margin:28px 0 12px;
}
.group-label::after{content:"";flex:1;height:1px;background:var(--line)}

/* ---------- tablas ---------- */
.tbl{width:100%;border-collapse:collapse}
.tbl th{
  text-align:left;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--ink-3);font-weight:400;padding:0 8px 8px 0;
}
.tbl td{padding:3px 8px 3px 0;vertical-align:middle}
.tbl tr:last-child td{padding-bottom:0}

/* ---------- swatches ---------- */
.ramp{display:grid;grid-template-columns:repeat(10,1fr);gap:6px}
.swatch{height:46px;border-radius:2px;border:1px solid rgba(0,0,0,.07);width:100%;display:block;transition:.12s}
button.swatch:hover{transform:translateY(-2px)}
.sw-meta{margin-top:6px;font-size:10.5px;color:var(--ink-3);line-height:1.35}
.badge-aa{
  display:inline-block;padding:0 4px;border-radius:2px;font-size:9.5px;font-weight:600;
  background:#E7F3E9;color:#2A6B39;letter-spacing:.03em;
}
.badge-aa.fail{background:#FBE9E7;color:#A93B2C}
.badge-aa.aaa{background:#DDEEE1;color:#1F5A2E}

/* ---------- tags de estado ---------- */
.tag{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:99px;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase}
.tag-draft{border:1px solid var(--line-2);color:var(--ink-3);background:var(--surface)}
.tag-pub{background:#5E8E96;color:#fff}

/* ---------- dashboard ---------- */
.ds-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.ds-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;transition:.15s;text-align:left;position:relative}
.ds-card:hover{border-color:var(--line-2);box-shadow:0 6px 20px -12px rgba(38,36,31,.4)}
.ds-card-prev{height:128px;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;border-bottom:1px solid var(--line)}
.ds-card-body{padding:14px 16px 14px;background:var(--paper-2)}
.ds-card-name{font-family:var(--serif);font-size:20px;letter-spacing:-.01em;color:var(--ink);margin:0}
.menu{position:absolute;right:10px;bottom:44px;z-index:20;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r);box-shadow:0 12px 28px -14px rgba(38,36,31,.45);min-width:170px;overflow:hidden}
.menu button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 14px;font-size:13px;color:var(--ink-2);border-bottom:1px solid var(--line)}
.menu button:last-child{border-bottom:none}
.menu button:hover{background:var(--paper-2)}
.empty{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 20px;gap:14px}

/* ---------- drawer ---------- */
.scrim{position:fixed;inset:0;background:rgba(26,24,21,.34);z-index:60;animation:fade .18s ease}
.drawer{
  position:fixed;top:0;right:0;bottom:0;width:min(520px,94vw);background:var(--paper);
  border-left:1px solid var(--line-2);z-index:61;display:flex;flex-direction:column;
  box-shadow:-24px 0 60px -30px rgba(26,24,21,.5);animation:slide .22s cubic-bezier(.22,.7,.3,1);
}
.drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:20px 24px;border-bottom:1px solid var(--line);background:var(--paper)}
.drawer-body{flex:1;overflow-y:auto;padding:4px 24px 28px}
.drawer-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 24px;border-top:1px solid var(--line);background:var(--surface-2)}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes slide{from{transform:translateX(24px);opacity:.4}to{transform:none;opacity:1}}

/* ---------- previews ---------- */
.preview-stage{
  background:var(--paper-3);border:1px solid var(--line);border-radius:var(--r);
  padding:28px 24px;display:flex;flex-wrap:wrap;align-items:center;gap:28px;min-height:120px;
}
.preview-stage.dark{background:#22201D;border-color:#3A3733}
.prev-cell{display:flex;flex-direction:column;gap:9px;align-items:flex-start}
.prev-cell-lbl{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}
.preview-stage.dark .prev-cell-lbl{color:#9C978F}
.comp-card{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);margin-bottom:20px;overflow:hidden}
.comp-head{display:flex;align-items:center;justify-content:space-between;padding:14px 22px}
.comp-ctrls{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 22px;background:var(--paper-3);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.ctrl{display:flex;align-items:center;gap:8px}
.ctrl > .lbl{white-space:nowrap}

/* skeleton */
.skel{background:linear-gradient(90deg,var(--paper-2) 25%,#E7E2D8 50%,var(--paper-2) 75%);background-size:400% 100%;animation:sk 1.3s infinite;border-radius:2px}
@keyframes sk{0%{background-position:100% 0}100%{background-position:-100% 0}}

/* progreso de generación */
.gen-overlay{position:fixed;inset:0;background:var(--paper);z-index:80;display:flex;align-items:center;justify-content:center}
.gen-box{width:min(460px,90vw);display:flex;flex-direction:column;gap:16px}
.bar{height:3px;background:var(--paper-2);border-radius:99px;overflow:hidden}
.bar > i{display:block;height:100%;background:var(--black);transition:width .3s ease}

/* toast */
.toast{
  position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:90;
  background:var(--black);color:#fff;padding:10px 18px;border-radius:var(--r);font-size:12.5px;
  box-shadow:0 12px 30px -12px rgba(0,0,0,.5);animation:up .2s ease;
}
@keyframes up{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}

/* código */
pre.code{
  background:var(--paper-3);border:1px solid var(--line);border-radius:var(--r);
  padding:18px 20px;font-size:11.5px;line-height:1.65;overflow:auto;max-height:420px;
  white-space:pre;color:var(--ink-2);margin:0;
}

/* grid overlay preview */
.grid-prev{display:grid;border:1px dashed var(--line-2);border-radius:2px;padding:8px}
.grid-col{height:96px;background:#E4EEF0;border:1px solid #D2E2E5;border-radius:2px}

@media (max-width:1100px){
  .ds-grid{grid-template-columns:repeat(2,1fr)}
  .stepper .step-lbl{display:none}
}
@media (max-width:760px){
  .ds-grid{grid-template-columns:1fr}
  .wrap,.wrap-narrow,.topbar-in{padding:0 20px}
}
`;
    var tn = (t, e = 0, n = 1) => Math.min(n, Math.max(e, t));

    function Cf(t) {
        let e = String(t || "").trim().replace("#", "");
        return e.length === 3 && (e = e.split("").map(n => n + n).join("")), /^[0-9a-fA-F]{6}$/.test(e) ? {
            r: parseInt(e.slice(0, 2), 16) / 255,
            g: parseInt(e.slice(2, 4), 16) / 255,
            b: parseInt(e.slice(4, 6), 16) / 255
        } : null
    }
    var E2 = t => Cf(t) !== null;

    function zC({
        r: t,
        g: e,
        b: n
    }) {
        let l = a => Math.round(tn(a) * 255).toString(16).padStart(2, "0");
        return ("#" + l(t) + l(e) + l(n)).toUpperCase()
    }
    var Pu = t => t <= .04045 ? t / 12.92 : Math.pow((t + .055) / 1.055, 2.4),
        B0 = t => t <= .0031308 ? t * 12.92 : 1.055 * Math.pow(t, 1 / 2.4) - .055;

    function MC({
        r: t,
        g: e,
        b: n
    }) {
        let l = Pu(t),
            a = Pu(e),
            i = Pu(n),
            u = Math.cbrt(.4122214708 * l + .5363325363 * a + .0514459929 * i),
            o = Math.cbrt(.2119034982 * l + .6806995451 * a + .1073969566 * i),
            r = Math.cbrt(.0883024619 * l + .2817188376 * a + .6299787005 * i);
        return {
            L: .2104542553 * u + .793617785 * o - .0040720468 * r,
            a: 1.9779984951 * u - 2.428592205 * o + .4505937099 * r,
            b: .0259040371 * u + .7827717662 * o - .808675766 * r
        }
    }

    function wC({
        L: t,
        a: e,
        b: n
    }) {
        let l = Math.pow(t + .3963377774 * e + .2158037573 * n, 3),
            a = Math.pow(t - .1055613458 * e - .0638541728 * n, 3),
            i = Math.pow(t - .0894841775 * e - 1.291485548 * n, 3);
        return {
            r: B0(4.0767416621 * l - 3.3077115913 * a + .2309699292 * i),
            g: B0(-1.2684380046 * l + 2.6097574011 * a - .3413193965 * i),
            b: B0(-.0041960863 * l - .7034186147 * a + 1.707614701 * i)
        }
    }

    function Ml(t) {
        let e = Cf(t) || {
                r: 0,
                g: 0,
                b: 0
            },
            {
                L: n,
                a: l,
                b: a
            } = MC(e);
        return {
            L: n,
            C: Math.sqrt(l * l + a * a),
            h: Math.atan2(a, l) * 180 / Math.PI
        }
    }
    var S2 = ({
        r: t,
        g: e,
        b: n
    }) => t >= -5e-4 && t <= 1.0005 && e >= -5e-4 && e <= 1.0005 && n >= -5e-4 && n <= 1.0005;

    function sa(t, e, n) {
        let l = n * Math.PI / 180,
            a = u => wC({
                L: tn(t, 0, 1),
                a: Math.cos(l) * u,
                b: Math.sin(l) * u
            }),
            i = a(e);
        if (!S2(i)) {
            let u = 0,
                o = e;
            for (let r = 0; r < 24; r++) {
                let c = (u + o) / 2;
                S2(a(c)) ? u = c : o = c
            }
            i = a(u)
        }
        return zC({
            r: tn(i.r),
            g: tn(i.g),
            b: tn(i.b)
        })
    }

    function T2(t) {
        let e = Cf(t) || {
            r: 0,
            g: 0,
            b: 0
        };
        return .2126 * Pu(e.r) + .7152 * Pu(e.g) + .0722 * Pu(e.b)
    }

    function H0(t, e) {
        let n = T2(t),
            l = T2(e);
        return (Math.max(n, l) + .05) / (Math.min(n, l) + .05)
    }
    var wl = t => H0(t, "#FFFFFF") >= H0(t, "#111111") ? "#FFFFFF" : "#111111";

    function Ka(t) {
        let e = wl(t),
            n = H0(t, e),
            l = n >= 7 ? "AAA" : n >= 4.5 ? "AA" : n >= 3 ? "AA+" : "FAIL";
        return {
            ratio: Math.round(n * 10) / 10,
            level: l,
            on: e
        }
    }
    var fa = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900],
        Tf = [.972, .938, .884, .812, .724, .632, .545, .455, .362, .264],
        C2 = [.2, .34, .56, .78, .94, 1, .98, .9, .78, .62];

    function Pa(t, e = {}) {
        let {
            chromaBoost: n = 1,
            hueShift: l = 0,
            aaa: a = !1,
            lShift: i = 0
        } = e, {
            C: u,
            h: o
        } = Ml(t), r = Math.max(u, .012) * n, c = {};
        fa.forEach((d, g) => {
            let x = Tf[g];
            i && (x = tn(x + i * 4 * x * (1 - x), .04, .99)), a && (x = tn(x + (g < 5 ? .018 : -.022), .04, .99)), c[d] = sa(x, r * C2[g], o + l)
        });
        let f = Ml(t).L,
            s = Tf.reduce((d, g, x) => Math.abs(g - f) < Math.abs(Tf[d] - f) ? x : d, 0);
        return c[fa[s]] = String(t).toUpperCase(), c
    }
    var Ef = {
        "Gris puro": {
            hue: null,
            chroma: 0
        },
        "Gris c\xE1lido": {
            hue: 70,
            chroma: .012
        },
        "Gris fr\xEDo": {
            hue: 250,
            chroma: .014
        },
        "Matiz del primario": {
            hue: "primary",
            chroma: .018
        }
    };

    function ec(t, e, n) {
        let l = Ef[t] || Ef["Gris puro"],
            a = l.hue === "primary" ? Ml(e).h : l.hue == null ? 0 : l.hue,
            i = {};
        return fa.forEach((u, o) => {
            let r = Tf[o];
            n && (r = tn(r + (o < 5 ? .02 : -.03), .03, .995)), i[u] = sa(r, l.chroma * C2[o], a)
        }), i
    }
    var AC = {
        success: {
            h: 152,
            C: .17,
            lShift: .03
        },
        warning: {
            h: 88,
            C: .17,
            lShift: .15
        },
        error: {
            h: 27,
            C: .2,
            lShift: .02
        },
        info: {
            h: 254,
            C: .18,
            lShift: 0
        }
    };

    function zf(t, e, n) {
        let l = Ml(t).C,
            a = {};
        return Object.entries(AC).forEach(([i, u]) => {
            let o = e ? u.C * .6 + Math.max(l, .06) * .7 : u.C,
                r = sa(.63 + u.lShift, o, u.h);
            a[i] = Pa(r, {
                aaa: n,
                lShift: u.lShift
            })
        }), a
    }
    var qu = [50, 100, 200];

    function nc(t) {
        let {
            L: e,
            C: n,
            h: l
        } = Ml(t);
        return {
            50: sa(tn(.955 + (e - .63) * .05, 0, .99), n * .17, l),
            100: sa(tn(.885 + (e - .63) * .12, 0, .99), n * .42, l),
            200: String(t).toUpperCase()
        }
    }

    function U0(t) {
        let {
            L: e,
            C: n,
            h: l
        } = Ml(t);
        return {
            secondary: sa(tn(e + .02, .2, .85), n * .95, l + 152),
            accent: sa(tn(e + .06, .2, .88), Math.min(n * 1.25, .28), l - 42)
        }
    }

    function Xn(t, e) {
        let n = Cf(t) || {
            r: 0,
            g: 0,
            b: 0
        };
        return `rgba(${Math.round(n.r*255)}, ${Math.round(n.g*255)}, ${Math.round(n.b*255)}, ${e})`
    }
    var z2 = [{
            name: "Minor Second",
            value: 1.067,
            desc: "Muy bajo contraste"
        }, {
            name: "Major Second",
            value: 1.125,
            desc: "Bajo contraste"
        }, {
            name: "Minor Third",
            value: 1.2,
            desc: "Equilibrado"
        }, {
            name: "Major Third",
            value: 1.25,
            desc: "Est\xE1ndar web"
        }, {
            name: "Perfect Fourth",
            value: 1.333,
            desc: "Jerarqu\xEDa marcada"
        }, {
            name: "Augmented Fourth",
            value: 1.414,
            desc: "Editorial"
        }, {
            name: "Perfect Fifth",
            value: 1.5,
            desc: "Dram\xE1tico"
        }],
        M2 = [{
            label: "Small",
            value: 14
        }, {
            label: "Medium",
            value: 16
        }, {
            label: "Large",
            value: 18
        }],
        Vi = {
            Sharp: {
                scale: {
                    xs: 0,
                    sm: 0,
                    md: 0,
                    lg: 0,
                    xl: 0,
                    "2xl": 0,
                    full: 0
                },
                sample: 0
            },
            Subtle: {
                scale: {
                    xs: 2,
                    sm: 3,
                    md: 4,
                    lg: 6,
                    xl: 8,
                    "2xl": 12,
                    full: 999
                },
                sample: 4
            },
            Playful: {
                scale: {
                    xs: 4,
                    sm: 6,
                    md: 8,
                    lg: 12,
                    xl: 16,
                    "2xl": 24,
                    full: 999
                },
                sample: 8
            },
            Round: {
                scale: {
                    xs: 6,
                    sm: 10,
                    md: 14,
                    lg: 18,
                    xl: 24,
                    "2xl": 32,
                    full: 999
                },
                sample: 16
            },
            Full: {
                scale: {
                    xs: 8,
                    sm: 12,
                    md: 999,
                    lg: 24,
                    xl: 32,
                    "2xl": 40,
                    full: 999
                },
                sample: 999
            }
        },
        RC = {
            button: "md",
            input: "sm",
            card: "lg",
            modal: "xl",
            badge: "full",
            tooltip: "sm",
            checkbox: "xs",
            dropdown: "md",
            notification: "md",
            tag: "full"
        },
        Mf = {
            None: {
                alpha: 0,
                blur: 0
            },
            Subtle: {
                alpha: .55,
                blur: .75
            },
            Medium: {
                alpha: 1,
                blur: 1
            },
            Pronounced: {
                alpha: 1.6,
                blur: 1.4
            }
        },
        NC = [{
            name: "sm",
            x: 0,
            y: 1,
            blur: 2,
            spread: 0,
            opacity: .05
        }, {
            name: "md",
            x: 0,
            y: 4,
            blur: 8,
            spread: 0,
            opacity: .08
        }, {
            name: "lg",
            x: 0,
            y: 8,
            blur: 16,
            spread: -2,
            opacity: .1
        }, {
            name: "xl",
            x: 0,
            y: 12,
            blur: 24,
            spread: -4,
            opacity: .12
        }],
        ju = {
            Compact: .75,
            Regular: 1,
            Relaxed: 1.35
        },
        kC = [.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16],
        OC = ["3xs", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
        DC = [{
            key: "display-xl",
            label: "Display XL",
            preview: "Display Extra Large",
            step: 7,
            weight: 700,
            lh: 1.1,
            family: "heading"
        }, {
            key: "display-l",
            label: "Display L",
            preview: "Display Large",
            step: 6,
            weight: 700,
            lh: 1.1,
            family: "heading"
        }, {
            key: "h1",
            label: "H1",
            preview: "Header Large",
            step: 5,
            weight: 700,
            lh: 1.2,
            family: "heading"
        }, {
            key: "h2",
            label: "H2",
            preview: "Header Medium",
            step: 4,
            weight: 700,
            lh: 1.25,
            family: "heading"
        }, {
            key: "h3",
            label: "H3",
            preview: "Header Small",
            step: 3,
            weight: 600,
            lh: 1.3,
            family: "heading"
        }, {
            key: "h4",
            label: "H4",
            preview: "Subhead Large",
            step: 2,
            weight: 600,
            lh: 1.35,
            family: "heading"
        }, {
            key: "h5",
            label: "H5",
            preview: "Subhead Medium",
            step: 1,
            weight: 600,
            lh: 1.4,
            family: "heading"
        }, {
            key: "h6",
            label: "H6",
            preview: "Subhead Small",
            step: .5,
            weight: 600,
            lh: 1.4,
            family: "heading"
        }, {
            key: "body-m",
            label: "Body M",
            preview: "Body Regular",
            step: 0,
            weight: 400,
            lh: 1.55,
            family: "body"
        }, {
            key: "body-s",
            label: "Body S",
            preview: "Body Small",
            step: -1,
            weight: 400,
            lh: 1.5,
            family: "body"
        }, {
            key: "caption",
            label: "Caption",
            preview: "Caption Micro",
            step: -2,
            weight: 400,
            lh: 1.4,
            family: "body"
        }],
        _C = [{
            name: "Mobile",
            min: 0,
            max: 767
        }, {
            name: "Tablet",
            min: 768,
            max: 1023
        }, {
            name: "Desktop",
            min: 1024,
            max: 1439
        }, {
            name: "Wide",
            min: 1440,
            max: null
        }],
        BC = [{
            name: "Mobile",
            columns: 4,
            margin: 16,
            gutter: 16
        }, {
            name: "Tablet",
            columns: 8,
            margin: 24,
            gutter: 20
        }, {
            name: "Desktop",
            columns: 12,
            margin: 40,
            gutter: 24
        }, {
            name: "Wide",
            columns: 12,
            margin: 80,
            gutter: 24
        }],
        wf = () => ({
            name: "",
            logo: null,
            logoDark: null,
            useLogoDark: !1,
            mode: "Both",
            highContrast: !1,
            colors: {
                primary: "#0E9F8C",
                secondary: "#E5117F"
            },
            neutralPreset: "Gris fr\xEDo",
            harmonize: !0,
            fonts: {
                heading: "IBM Plex Serif",
                body: "IBM Plex Mono"
            },
            baseSize: 16,
            ratio: 1.25,
            shadow: "Medium",
            radiusStyle: "Subtle",
            spacingUnit: 8,
            density: "Regular",
            breakpoints: _C.map(t => ({
                ...t
            })),
            grid: BC.map(t => ({
                ...t
            }))
        }),
        w2 = t => Math.round(t * 100) / 100;

    function L0(t) {
        let e = !!t.highContrast,
            n = t.colors.primary,
            l = {};
        Object.entries(t.colors).forEach(([m, E]) => {
            l[m] = Pa(E, {
                aaa: e
            })
        }), l.neutral = ec(t.neutralPreset, n, e);
        let a = zf(n, t.harmonize, e),
            i = {};
        Object.entries(a).forEach(([m, E]) => {
            i[m] = nc(E[500])
        });
        let u = m => m <= 0 ? m * .6 : m <= 3 ? m : 3 + (m - 3) * .72,
            o = DC.map(m => {
                let E = Math.max(10, Math.round(t.baseSize * Math.pow(t.ratio, u(m.step))));
                return {
                    key: m.key,
                    label: m.label,
                    preview: m.preview,
                    family: m.family,
                    size: E,
                    weight: m.weight,
                    lineHeight: Math.round(E * m.lh),
                    letterSpacing: E >= 32 ? -1 : E >= 24 ? -.5 : 0
                }
            }),
            r = ju[t.density] || 1,
            c = kC.map((m, E) => ({
                name: OC[E],
                value: Math.max(2, Math.round(t.spacingUnit * m * r / 2) * 2)
            })),
            f = {
                ...(Vi[t.radiusStyle] || Vi.Subtle).scale
            },
            s = {
                ...RC
            },
            d = Mf[t.shadow] || Mf.Medium,
            g = l.neutral[900],
            x = NC.map(m => ({
                name: m.name,
                x: m.x,
                y: Math.round(m.y * (d.blur || .001)),
                blur: Math.round(m.blur * (d.blur || .001)),
                spread: m.spread,
                color: g,
                opacity: w2(m.opacity * d.alpha)
            }));
        return {
            palette: l,
            semantic: a,
            semanticScale: i,
            typography: o,
            spacing: c,
            radius: f,
            radiusMap: s,
            shadows: x,
            breakpoints: t.breakpoints.map(m => ({
                ...m
            })),
            grid: t.grid.map(m => ({
                ...m
            })),
            fonts: {
                ...t.fonts
            },
            modes: t.mode,
            highContrast: e,
            locks: {}
        }
    }
    var Al = t => t.opacity <= 0 ? "none" : `${t.x}px ${t.y}px ${t.blur}px ${t.spread}px ${Xn(t.color,t.opacity)}`,
        Sn = t => t >= 999 ? "999px" : t + "px";

    function Rl(t, e) {
        let n = t.palette.neutral;
        return e === "dark" ? {
            canvas: n[900],
            surface: sa(tn(Ml(n[900]).L + .05, 0, 1), Ml(n[900]).C, Ml(n[900]).h),
            surfaceAlt: n[800],
            border: n[700],
            text: n[50],
            textMuted: n[300],
            inverted: n[900]
        } : {
            canvas: n[50],
            surface: "#FFFFFF",
            surfaceAlt: n[100],
            border: n[200],
            text: n[900],
            textMuted: n[600],
            inverted: "#FFFFFF"
        }
    }

    function A2(t, e) {
        let n = {
            meta: {
                name: e.name || "Generated System",
                generatedAt: new Date().toISOString(),
                modes: t.modes,
                highContrast: t.highContrast,
                fontImportUrl: $u(t.fonts)
            },
            color: {},
            typography: {},
            spacing: {},
            radius: {},
            shadow: {},
            breakpoint: {},
            grid: {}
        };
        return Object.entries(t.palette).forEach(([l, a]) => {
            n.color[l] = {}, Object.entries(a).forEach(([i, u]) => {
                let o = Ka(u);
                n.color[l][i] = {
                    value: u,
                    contrast: o.ratio,
                    level: o.level,
                    on: o.on
                }
            })
        }), Object.entries(t.semanticScale || {}).forEach(([l, a]) => {
            n.color[l] = {}, Object.entries(a).forEach(([i, u]) => {
                let o = Ka(u);
                n.color[l][i] = {
                    value: u,
                    contrast: o.ratio,
                    level: o.level,
                    on: o.on
                }
            })
        }), t.typography.forEach(l => {
            n.typography[l.key] = {
                fontFamily: l.family === "heading" ? t.fonts.heading : t.fonts.body,
                fontSize: l.size + "px",
                fontWeight: l.weight,
                lineHeight: l.lineHeight + "px",
                letterSpacing: l.letterSpacing + "px"
            }
        }), t.spacing.forEach(l => {
            n.spacing[l.name] = {
                value: l.value + "px",
                rem: w2(l.value / 16) + "rem"
            }
        }), Object.entries(t.radius).forEach(([l, a]) => {
            n.radius[l] = {
                value: Sn(a)
            }
        }), n.radius.componentMap = t.radiusMap, t.shadows.forEach(l => {
            n.shadow[l.name] = {
                value: Al(l),
                ...l
            }
        }), t.breakpoints.forEach(l => {
            n.breakpoint[l.name.toLowerCase()] = {
                min: l.min + "px",
                max: l.max == null ? null : l.max + "px"
            }
        }), t.grid.forEach(l => {
            n.grid[l.name.toLowerCase()] = {
                columns: l.columns,
                margin: l.margin + "px",
                gutter: l.gutter + "px"
            }
        }), n
    }

    function $u(t) {
        return `https://fonts.googleapis.com/css2?${[...new Set([t.heading,t.body].filter(Boolean))].map(l=>`family=${encodeURIComponent(l).replace(/%20/g,"+")}:wght@400;500;600;700`).join("&")}&display=swap`
    }
    var qa = (t, e) => `/* ${t} */
${e.join(`
`)}`;

    function F0(t) {
        let e = [],
            n = [];
        Object.entries(t.palette).forEach(([a, i]) => Object.entries(i).forEach(([u, o]) => n.push(`  --ds-${a}-${u}: ${o};`))), e.push({
            id: "palette",
            title: "Paleta generada",
            css: qa("Paleta", [":root {", ...n, "}"])
        });
        let l = [];
        return Object.entries(t.semanticScale || {}).forEach(([a, i]) => Object.entries(i).forEach(([u, o]) => l.push(`  --ds-${a}-${u}: ${o};`))), e.push({
            id: "semantic",
            title: "Colores sem\xE1nticos",
            css: qa("Sem\xE1nticos", [":root {", ...l, "}"])
        }), e.push({
            id: "typography",
            title: "Escala tipogr\xE1fica",
            css: qa("Tipograf\xEDa", [`@import url("${$u(t.fonts)}");`, ":root {", `  --ds-font-heading: "${t.fonts.heading}", Georgia, serif;`, `  --ds-font-body: "${t.fonts.body}", system-ui, sans-serif;`, ...t.typography.flatMap(a => [`  --ds-font-size-${a.key}: ${a.size}px;`, `  --ds-line-height-${a.key}: ${a.lineHeight}px;`, `  --ds-font-weight-${a.key}: ${a.weight};`]), "}", ...t.typography.map(a => `.ds-${a.key} { font-family: var(--ds-font-${a.family==="heading"?"heading":"body"}); font-size: var(--ds-font-size-${a.key}); line-height: var(--ds-line-height-${a.key}); font-weight: var(--ds-font-weight-${a.key}); letter-spacing: ${a.letterSpacing}px; }`)])
        }), e.push({
            id: "spacing",
            title: "Escala de espaciado",
            css: qa("Spacing", [":root {", ...t.spacing.map(a => `  --ds-space-${a.name}: ${a.value}px;`), "}"])
        }), e.push({
            id: "radius",
            title: "Escala de radios",
            css: qa("Radius", [":root {", ...Object.entries(t.radius).map(([a, i]) => `  --ds-radius-${a}: ${Sn(i)};`), "}", ...Object.entries(t.radiusMap).map(([a, i]) => `.ds-${a} { border-radius: var(--ds-radius-${i}); }`)])
        }), e.push({
            id: "shadows",
            title: "Sombras",
            css: qa("Shadows", [":root {", ...t.shadows.map(a => `  --ds-shadow-${a.name}: ${Al(a)};`), "}"])
        }), e.push({
            id: "breakpoints",
            title: "Breakpoints",
            css: qa("Breakpoints", t.breakpoints.map(a => `@media (min-width: ${a.min}px) { /* ${a.name} */ }`))
        }), e.push({
            id: "grid",
            title: "Grid",
            css: qa("Grid", t.grid.map(a => `/* ${a.name} */ .ds-grid-${a.name.toLowerCase()} { display: grid; grid-template-columns: repeat(${a.columns}, 1fr); gap: ${a.gutter}px; padding-inline: ${a.margin}px; }`))
        }), e
    }
    var Af = t => F0(t).map(e => e.css).join(`

`);
    var rM = ht(Je());
    var w = ht(te()),
        N2 = {
            SM: .86,
            MD: 1,
            LG: 1.14
        };

    function ja(t, e) {
        let n = Rl(t, e),
            l = {};
        t.typography.forEach(o => {
            l[o.key] = o
        });
        let a = {};
        t.spacing.forEach(o => {
            a[o.name] = o.value
        });
        let i = {};
        t.shadows.forEach(o => {
            i[o.name] = Al(o)
        });
        let u = {};
        return Object.entries(t.radius).forEach(([o, r]) => {
            u[o] = Sn(r)
        }), {
            s: n,
            ty: l,
            sp: a,
            sh: i,
            rad: u,
            dark: e === "dark",
            body: `"${t.fonts.body}", ui-sans-serif, system-ui, sans-serif`,
            heading: `"${t.fonts.heading}", Georgia, serif`,
            P: t.palette.primary,
            N: t.palette.neutral,
            SEC: t.palette.secondary || t.palette.primary,
            ACC: t.palette.accent || t.palette.secondary || t.palette.primary,
            sem: t.semantic,
            raw: t
        }
    }
    var H = t => `${Math.round(t)}px`,
        ne = (t, e) => t.rad[e] || "4px";

    function HC(t, e) {
        let n = e.props,
            l = e.state === "Expanded",
            a = e.state === "Hover",
            i = e.state === "Disabled",
            u = e.variant,
            o = ["Primer panel del acorde\xF3n", "Segundo panel", "Tercer panel"],
            r = e.anatomy.iconType === "Plus / Minus" ? l ? "\u2212" : "+" : l ? "\u2303" : "\u2304",
            c = {
                fontFamily: t.body,
                fontSize: H(t.ty["body-m"].size),
                color: t.s.text,
                width: 420,
                maxWidth: "100%",
                opacity: i ? .45 : 1,
                display: "flex",
                flexDirection: "column",
                gap: u === "Separated Cards" ? H(n.gap) : 0
            };
        return (0, w.jsx)("div", {
            style: c,
            children: o.map((f, s) => {
                let d = l && s === 0,
                    g = a && s === 0,
                    x = {
                        border: u === "Flush" ? "none" : `1px solid ${t.s.border}`,
                        borderRadius: u === "Separated Cards" ? ne(t, "lg") : 0,
                        borderTop: u === "Bordered" && s > 0 ? "none" : void 0,
                        borderBottom: u === "Flush" ? `1px solid ${t.s.border}` : void 0,
                        background: u === "Separated Cards" ? t.s.surface : "transparent",
                        boxShadow: u === "Separated Cards" ? t.sh.sm : "none",
                        overflow: "hidden"
                    };
                return (0, w.jsxs)("div", {
                    style: x,
                    children: [(0, w.jsxs)("div", {
                        style: {
                            display: "flex",
                            alignItems: "center",
                            gap: H(n.gap),
                            flexDirection: e.anatomy.iconSide === "Izquierda" ? "row-reverse" : "row",
                            justifyContent: "space-between",
                            padding: `${H(n.padY)} ${H(n.padX)}`,
                            background: g ? t.dark ? t.N[800] : t.N[50] : "transparent",
                            fontWeight: 500
                        },
                        children: [(0, w.jsx)("span", {
                            style: {
                                flex: e.anatomy.iconSide === "Izquierda" ? "1" : "unset"
                            },
                            children: f
                        }), (0, w.jsx)("span", {
                            style: {
                                color: t.s.textMuted,
                                fontSize: H(n.iconSize),
                                lineHeight: 1
                            },
                            children: s === 0 ? r : "\u2304"
                        })]
                    }), d && (0, w.jsx)("div", {
                        style: {
                            padding: `0 ${H(n.padX)} ${H(n.padY)}`,
                            color: t.s.textMuted,
                            fontSize: H(t.ty["body-s"].size),
                            lineHeight: 1.6
                        },
                        children: "Contenido del panel generado con los tokens de spacing y tipograf\xEDa del sistema."
                    })]
                }, s)
            })
        })
    }

    function UC(t, e) {
        let n = e.props,
            l = {
                Neutral: t.N,
                Primary: t.P,
                Success: t.sem.success,
                Warning: t.sem.warning,
                Error: t.sem.error,
                Info: t.sem.info
            } [e.intention || "Primary"],
            a = l[t.dark ? 400 : 600],
            i = {
                Solid: {
                    background: a,
                    color: wl(a),
                    border: "1px solid transparent"
                },
                "Soft / Subtle": {
                    background: l[t.dark ? 800 : 100],
                    color: l[t.dark ? 200 : 800],
                    border: "1px solid transparent"
                },
                Outline: {
                    background: "transparent",
                    color: l[t.dark ? 300 : 700],
                    border: `1px solid ${l[t.dark?600:300]}`
                }
            } [e.variant],
            u = e.anatomy;
        return (0, w.jsxs)("span", {
            style: {
                ...i,
                display: "inline-flex",
                alignItems: "center",
                gap: H(n.gap),
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                fontWeight: 500,
                lineHeight: 1,
                padding: u.anatomy === "Solo punto" ? H(n.padY) : `${H(n.padY)} ${H(n.padX)}`,
                borderRadius: e.anatomy.shape === "Sharp" ? ne(t, "xs") : "999px"
            },
            children: [(u.anatomy === "Punto + texto" || u.anatomy === "Solo punto") && (0, w.jsx)("i", {
                style: {
                    width: n.fontSize * .5,
                    height: n.fontSize * .5,
                    borderRadius: 99,
                    background: "currentColor",
                    display: "block"
                }
            }), u.anatomy !== "Solo punto" && (0, w.jsx)("span", {
                children: "Label"
            }), u.anatomy === "Con cierre (X)" && (0, w.jsx)("span", {
                style: {
                    opacity: .7,
                    fontWeight: 400
                },
                children: "\xD7"
            })]
        })
    }

    function LC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Disabled",
            i = {
                Primary: t.P,
                Secondary: t.N,
                Tertiary: t.N,
                Destructive: t.sem.error
            } [e.variant],
            u = i[t.dark ? 400 : 600],
            o = i[t.dark ? 300 : 700],
            r = i[t.dark ? 200 : 800],
            c;
        if (e.variant === "Primary" || e.variant === "Destructive") {
            let s = l === "Hover" ? o : l === "Active" ? r : u;
            c = {
                background: s,
                color: wl(s),
                border: "1px solid transparent"
            }
        } else e.variant === "Secondary" ? c = {
            background: l === "Hover" ? t.dark ? t.N[800] : t.N[50] : t.s.surface,
            color: t.s.text,
            border: `1px solid ${t.s.border}`
        } : c = {
            background: l === "Hover" ? t.dark ? t.N[800] : t.N[100] : "transparent",
            color: t.s.text,
            border: "1px solid transparent"
        };
        let f = l === "Focus" ? {
            boxShadow: `0 0 0 3px ${Xn(t.P[500],.35)}`
        } : {};
        return (0, w.jsxs)("button", {
            disabled: a,
            style: {
                ...c,
                ...f,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: H(n.gap),
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                fontWeight: 500,
                lineHeight: 1,
                padding: e.anatomy.icon === "Solo icono" ? H(n.padY) : `${H(n.padY)} ${H(n.padX)}`,
                borderRadius: ne(t, e.props.radiusToken || "md"),
                width: e.anatomy.width === "Full width" ? "100%" : "auto",
                opacity: a ? .45 : 1,
                cursor: a ? "not-allowed" : "pointer",
                boxShadow: c.background && e.variant === "Primary" ? t.sh.sm : f.boxShadow,
                transition: "all .15s"
            },
            children: [l === "Loading" && (0, w.jsx)(k2, {
                size: n.iconSize
            }), (e.anatomy.icon === "Izquierda" || e.anatomy.icon === "Solo icono") && l !== "Loading" && (0, w.jsx)(da, {
                size: n.iconSize
            }), e.anatomy.icon !== "Solo icono" && (0, w.jsx)("span", {
                children: l === "Loading" ? "Cargando\u2026" : "Button"
            }), e.anatomy.icon === "Derecha" && l !== "Loading" && (0, w.jsx)(da, {
                size: n.iconSize,
                arrow: !0
            })]
        })
    }
    var da = ({
            size: t = 14,
            arrow: e
        }) => (0, w.jsx)("svg", {
            width: t,
            height: t,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2",
            strokeLinecap: "round",
            strokeLinejoin: "round",
            children: e ? (0, w.jsx)(w.Fragment, {
                children: (0, w.jsx)("path", {
                    d: "M5 12h14M13 6l6 6-6 6"
                })
            }) : (0, w.jsxs)(w.Fragment, {
                children: [(0, w.jsx)("circle", {
                    cx: "12",
                    cy: "12",
                    r: "8.5"
                }), (0, w.jsx)("path", {
                    d: "M12 8v8M8 12h8"
                })]
            })
        }),
        k2 = ({
            size: t = 14
        }) => (0, w.jsxs)("svg", {
            width: t,
            height: t,
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "2.4",
            strokeLinecap: "round",
            children: [(0, w.jsx)("path", {
                d: "M12 3a9 9 0 1 1-6.4 2.6"
            }), (0, w.jsx)("animateTransform", {
                attributeName: "transform",
                type: "rotate",
                from: "0 12 12",
                to: "360 12 12",
                dur: "0.9s",
                repeatCount: "indefinite"
            })]
        });

    function FC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Checked",
            i = l === "Indeterminate",
            u = l === "Disabled",
            o = l === "Error",
            r = t.P[t.dark ? 400 : 600],
            c = {
                width: n.size,
                height: n.size,
                flexShrink: 0,
                borderRadius: H(n.radius),
                border: `${n.borderWidth}px solid ${o?t.sem.error[600]:a||i?r:l==="Hover"?t.N[t.dark?400:500]:t.s.border}`,
                background: a || i ? r : t.s.surface,
                display: "grid",
                placeItems: "center",
                color: wl(r),
                boxShadow: l === "Focus" ? `0 0 0 3px ${Xn(t.P[500],.3)}` : "none",
                transition: ".14s"
            };
        return (0, w.jsxs)("label", {
            style: {
                display: "inline-flex",
                gap: H(n.gap),
                alignItems: "flex-start",
                opacity: u ? .45 : 1,
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                color: t.s.text,
                cursor: u ? "not-allowed" : "pointer",
                flexDirection: e.anatomy.layout === "Control derecha" ? "row-reverse" : "row",
                justifyContent: e.anatomy.layout === "Control derecha" ? "space-between" : "flex-start",
                minWidth: e.anatomy.layout === "Control derecha" ? 220 : 0
            },
            children: [(0, w.jsx)("span", {
                style: c,
                children: i ? (0, w.jsx)("span", {
                    style: {
                        width: n.size * .5,
                        height: 2,
                        background: "currentColor",
                        borderRadius: 2
                    }
                }) : a ? (0, w.jsx)("svg", {
                    width: n.size * .7,
                    height: n.size * .7,
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: e.anatomy.check === "Fino" ? 2 : 3.4,
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    children: (0, w.jsx)("path", {
                        d: "m5 12 5 5L20 6"
                    })
                }) : null
            }), e.anatomy.label !== !1 && (0, w.jsxs)("span", {
                children: [(0, w.jsx)("span", {
                    children: "Acepto los t\xE9rminos"
                }), e.anatomy.helper && (0, w.jsx)("span", {
                    style: {
                        display: "block",
                        fontSize: H(t.ty.caption.size),
                        color: o ? t.sem.error[600] : t.s.textMuted,
                        marginTop: 2
                    },
                    children: o ? "Debes aceptar para continuar" : "Texto de ayuda opcional"
                })]
            })]
        })
    }

    function YC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Open",
            i = l === "Error",
            u = l === "Disabled",
            o = ["Opci\xF3n uno", "Opci\xF3n dos", "Opci\xF3n tres", "Opci\xF3n cuatro"];
        return (0, w.jsxs)("div", {
            style: {
                fontFamily: t.body,
                width: 260,
                position: "relative"
            },
            children: [(0, w.jsxs)("div", {
                style: {
                    height: n.height,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: `0 ${H(n.padX)}`,
                    borderRadius: ne(t, "md"),
                    fontSize: H(n.fontSize),
                    background: u ? t.dark ? t.N[800] : t.N[50] : t.s.surface,
                    color: u ? t.s.textMuted : t.s.text,
                    border: `1px solid ${i?t.sem.error[600]:a||l==="Focus"?t.P[t.dark?400:600]:l==="Hover"?t.N[t.dark?500:400]:t.s.border}`,
                    boxShadow: l === "Focus" || a ? `0 0 0 3px ${Xn(t.P[500],.28)}` : "none",
                    opacity: u ? .6 : 1
                },
                children: [(0, w.jsx)("span", {
                    children: a ? "Opci\xF3n dos" : "Selecciona una opci\xF3n"
                }), (0, w.jsx)("span", {
                    style: {
                        color: t.s.textMuted,
                        transform: a ? "rotate(180deg)" : "none",
                        lineHeight: 1
                    },
                    children: "\u2304"
                })]
            }), a && (0, w.jsxs)("div", {
                style: {
                    position: "absolute",
                    top: n.height + 6,
                    left: 0,
                    right: 0,
                    zIndex: 5,
                    background: t.s.surface,
                    border: `1px solid ${t.s.border}`,
                    borderRadius: ne(t, n.menuRadiusToken || "md"),
                    boxShadow: t.sh[n.elevation] || t.sh.lg,
                    overflow: "hidden",
                    maxHeight: n.maxHeight,
                    overflowY: "auto"
                },
                children: [e.anatomy.search && (0, w.jsx)("div", {
                    style: {
                        padding: H(n.itemPadY),
                        borderBottom: `1px solid ${t.s.border}`
                    },
                    children: (0, w.jsx)("div", {
                        style: {
                            height: 28,
                            borderRadius: ne(t, "sm"),
                            border: `1px solid ${t.s.border}`,
                            display: "flex",
                            alignItems: "center",
                            padding: "0 8px",
                            fontSize: H(t.ty.caption.size),
                            color: t.s.textMuted
                        },
                        children: "Buscar\u2026"
                    })
                }), e.anatomy.categories && (0, w.jsx)("div", {
                    style: {
                        padding: `6px ${H(n.itemPadX)} 2px`,
                        fontSize: H(t.ty.caption.size),
                        color: t.s.textMuted,
                        letterSpacing: ".06em",
                        textTransform: "uppercase"
                    },
                    children: "Categor\xEDa"
                }), o.map((r, c) => (0, w.jsxs)("div", {
                    style: {
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: `${H(n.itemPadY)} ${H(n.itemPadX)}`,
                        fontSize: H(n.fontSize),
                        color: t.s.text,
                        background: c === 1 ? t.dark ? t.N[800] : t.N[50] : "transparent"
                    },
                    children: [e.anatomy.itemIcon && (0, w.jsx)(da, {
                        size: n.fontSize
                    }), (0, w.jsxs)("span", {
                        style: {
                            flex: 1
                        },
                        children: [r, e.anatomy.itemDesc && (0, w.jsx)("span", {
                            style: {
                                display: "block",
                                fontSize: H(t.ty.caption.size),
                                color: t.s.textMuted
                            },
                            children: "Descripci\xF3n secundaria"
                        })]
                    }), e.anatomy.itemBadge && (0, w.jsx)("span", {
                        style: {
                            fontSize: H(t.ty.caption.size),
                            background: t.P[t.dark ? 800 : 100],
                            color: t.P[t.dark ? 200 : 800],
                            borderRadius: 99,
                            padding: "1px 7px"
                        },
                        children: "3"
                    }), e.anatomy.checkmark && c === 1 && (0, w.jsx)("span", {
                        style: {
                            color: t.P[t.dark ? 400 : 600]
                        },
                        children: "\u2713"
                    })]
                }, r))]
            })]
        })
    }

    function GC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Error",
            i = l === "Success",
            u = l === "Disabled",
            o = l === "Read-only",
            r = a ? t.sem.error[600] : i ? t.sem.success[600] : l === "Focus" ? t.P[t.dark ? 400 : 600] : l === "Hover" ? t.N[t.dark ? 500 : 400] : t.s.border,
            c = e.anatomy.labelLayout === "Floating",
            f = (0, w.jsxs)("div", {
                style: {
                    position: "relative",
                    flex: 1
                },
                children: [c && e.anatomy.label && (0, w.jsx)("span", {
                    style: {
                        position: "absolute",
                        top: -7,
                        left: 10,
                        padding: "0 4px",
                        background: t.s.surface,
                        fontSize: H(t.ty.caption.size),
                        color: l === "Focus" ? t.P[t.dark ? 400 : 600] : t.s.textMuted,
                        fontFamily: t.body
                    },
                    children: "Etiqueta"
                }), (0, w.jsxs)("div", {
                    style: {
                        height: n.height,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: `0 ${H(n.padX)}`,
                        borderRadius: ne(t, n.radiusToken || "sm"),
                        background: u || o ? t.dark ? t.N[800] : t.N[50] : t.s.surface,
                        borderWidth: H(n.borderWidth),
                        borderStyle: "solid",
                        borderColor: r,
                        boxShadow: l === "Focus" ? `0 0 0 3px ${Xn(t.P[500],.28)}` : "none",
                        opacity: u ? .6 : 1
                    },
                    children: [e.anatomy.leadingIcon && (0, w.jsx)("span", {
                        style: {
                            color: t.s.textMuted,
                            display: "flex"
                        },
                        children: (0, w.jsx)(da, {
                            size: n.fontSize
                        })
                    }), (0, w.jsx)("span", {
                        style: {
                            flex: 1,
                            fontFamily: t.body,
                            fontSize: H(n.fontSize),
                            color: l === "Typing" || o ? t.s.text : t.s.textMuted
                        },
                        children: o ? "Valor de solo lectura" : l === "Typing" ? "Escribiendo\u2026" : "Placeholder"
                    }), e.anatomy.trailingIcon && (0, w.jsx)("span", {
                        style: {
                            color: t.s.textMuted,
                            display: "flex"
                        },
                        children: (0, w.jsx)(da, {
                            size: n.fontSize,
                            arrow: !0
                        })
                    })]
                })]
            });
        return (0, w.jsxs)("div", {
            style: {
                fontFamily: t.body,
                width: 300,
                display: "flex",
                flexDirection: e.anatomy.labelLayout === "Izquierda" ? "row" : "column",
                gap: 6,
                alignItems: e.anatomy.labelLayout === "Izquierda" ? "center" : "stretch"
            },
            children: [e.anatomy.label && !c && (0, w.jsx)("label", {
                style: {
                    fontSize: H(t.ty["body-s"].size),
                    color: t.s.text,
                    width: e.anatomy.labelLayout === "Izquierda" ? 80 : "auto"
                },
                children: "Etiqueta"
            }), f, (e.anatomy.helper || e.anatomy.counter) && (0, w.jsxs)("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: H(t.ty.caption.size),
                    color: a ? t.sem.error[600] : i ? t.sem.success[700] : t.s.textMuted
                },
                children: [e.anatomy.helper && (0, w.jsx)("span", {
                    children: a ? "Este campo es obligatorio" : i ? "Todo correcto" : "Texto de ayuda"
                }), e.anatomy.counter && (0, w.jsx)("span", {
                    children: "0/120"
                })]
            })]
        })
    }

    function XC(t, e) {
        let n = e.props,
            l = e.state,
            a = e.variant === "Neutral" ? t.s.text : t.P[t.dark ? 300 : 600],
            i = l === "Hover" ? t.P[t.dark ? 200 : 700] : l === "Visited" ? t.SEC[t.dark ? 300 : 700] : l === "Active" ? t.P[t.dark ? 100 : 800] : a,
            u = e.anatomy.underline === "Siempre" || e.anatomy.underline === "En hover" && l === "Hover",
            o = (0, w.jsxs)("a", {
                href: "#",
                onClick: r => r.preventDefault(),
                style: {
                    color: i,
                    fontFamily: t.body,
                    fontSize: H(n.fontSize),
                    fontWeight: e.variant === "Standalone" ? 500 : 400,
                    textDecoration: u ? "underline" : "none",
                    textUnderlineOffset: H(n.underlineOffset),
                    display: "inline-flex",
                    alignItems: "center",
                    gap: H(n.gap),
                    outline: l === "Focus" ? `2px solid ${t.P[t.dark?400:600]}` : "none",
                    outlineOffset: 2,
                    borderRadius: 2
                },
                children: [e.anatomy.icon === "Izquierda" && (0, w.jsx)(da, {
                    size: n.fontSize
                }), "Ver documentaci\xF3n", e.anatomy.icon === "External" && (0, w.jsx)("span", {
                    style: {
                        fontSize: n.fontSize * .85
                    },
                    children: "\u2197"
                })]
            });
        return e.variant !== "Inline" ? o : (0, w.jsxs)("p", {
            style: {
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                color: t.s.text,
                margin: 0,
                maxWidth: 380,
                lineHeight: 1.6
            },
            children: ["Texto de p\xE1rrafo donde ", o, " aparece integrado en la l\xEDnea base."]
        })
    }

    function ZC(t, e) {
        let n = e.props,
            l = {
                Small: 400,
                Medium: 600,
                Large: 800,
                "Full screen": 900
            } [e.size] || 480;
        return (0, w.jsxs)("div", {
            style: {
                position: "relative",
                width: "100%",
                maxWidth: Math.min(l, 620),
                borderRadius: ne(t, n.radiusToken || "xl"),
                background: t.s.surface,
                boxShadow: t.sh[n.elevation] || t.sh.xl,
                border: `1px solid ${t.s.border}`,
                fontFamily: t.body,
                overflow: "hidden"
            },
            children: [e.anatomy.header && (0, w.jsxs)("div", {
                style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: `${H(n.padY)} ${H(n.padX)}`,
                    borderBottom: `1px solid ${t.s.border}`
                },
                children: [(0, w.jsx)("span", {
                    style: {
                        fontFamily: t.heading,
                        fontSize: H(t.ty.h4.size),
                        fontWeight: t.ty.h4.weight,
                        color: t.s.text
                    },
                    children: "T\xEDtulo del modal"
                }), e.anatomy.close && (0, w.jsx)("span", {
                    style: {
                        color: t.s.textMuted,
                        fontSize: 18,
                        lineHeight: 1
                    },
                    children: "\xD7"
                })]
            }), (0, w.jsxs)("div", {
                style: {
                    padding: `${H(n.padY)} ${H(n.padX)}`,
                    color: t.s.textMuted,
                    fontSize: H(t.ty["body-m"].size),
                    lineHeight: 1.6,
                    maxHeight: e.anatomy.scroll ? 120 : "none",
                    overflowY: e.anatomy.scroll ? "auto" : "visible"
                },
                children: ["Contenido del modal generado con el spacing, el radio y la elevaci\xF3n definidos en las foundations del sistema. El backdrop usa una opacidad del ", Math.round(n.backdropOpacity * 100), "%", n.backdropBlur > 0 ? ` y un blur de ${n.backdropBlur}px` : "", "."]
            }), e.anatomy.footer && (0, w.jsxs)("div", {
                style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    padding: `${H(n.padY*.75)} ${H(n.padX)}`,
                    borderTop: `1px solid ${t.s.border}`,
                    background: t.dark ? t.N[800] : t.N[50]
                },
                children: [(0, w.jsx)(R2, {
                    c: t,
                    kind: "ghost",
                    children: "Cancelar"
                }), (0, w.jsx)(R2, {
                    c: t,
                    children: "Confirmar"
                })]
            })]
        })
    }
    var R2 = ({
        c: t,
        kind: e,
        children: n
    }) => {
        let l = t.P[t.dark ? 400 : 600];
        return (0, w.jsx)("span", {
            style: {
                display: "inline-flex",
                alignItems: "center",
                padding: "7px 14px",
                borderRadius: ne(t, "md"),
                fontSize: H(t.ty["body-s"].size),
                fontFamily: t.body,
                fontWeight: 500,
                background: e === "ghost" ? "transparent" : l,
                color: e === "ghost" ? t.s.text : wl(l),
                border: e === "ghost" ? `1px solid ${t.s.border}` : "1px solid transparent"
            },
            children: n
        })
    };

    function QC(t, e) {
        let n = e.props,
            l = {
                Info: t.sem.info,
                Success: t.sem.success,
                Warning: t.sem.warning,
                "Error / Critical": t.sem.error
            } [e.intention || "Info"],
            a = l[t.dark ? 400 : 600],
            i = e.variant === "Solid" ? {
                background: a,
                color: wl(a),
                border: "1px solid transparent"
            } : e.variant === "Left-border accent" ? {
                background: t.s.surface,
                color: t.s.text,
                border: `1px solid ${t.s.border}`,
                borderLeft: `4px solid ${a}`
            } : {
                background: l[t.dark ? 800 : 50],
                color: t.dark ? l[100] : l[900],
                border: `1px solid ${l[t.dark?700:200]}`
            };
        return (0, w.jsxs)("div", {
            style: {
                ...i,
                display: "flex",
                gap: H(n.gap),
                alignItems: "flex-start",
                width: 400,
                maxWidth: "100%",
                padding: `${H(n.padY)} ${H(n.padX)}`,
                borderRadius: ne(t, n.radiusToken || "md"),
                boxShadow: t.sh[n.elevation] || "none",
                fontFamily: t.body,
                fontSize: H(t.ty["body-s"].size)
            },
            children: [e.anatomy.icon && (0, w.jsx)("span", {
                style: {
                    marginTop: 1,
                    display: "flex"
                },
                children: (0, w.jsx)(da, {
                    size: t.ty["body-m"].size
                })
            }), (0, w.jsxs)("div", {
                style: {
                    flex: 1
                },
                children: [e.anatomy.title && (0, w.jsx)("div", {
                    style: {
                        fontWeight: 600,
                        fontSize: H(t.ty["body-m"].size),
                        marginBottom: 2
                    },
                    children: "T\xEDtulo de la notificaci\xF3n"
                }), e.anatomy.desc && (0, w.jsx)("div", {
                    style: {
                        opacity: .85,
                        lineHeight: 1.55
                    },
                    children: "Mensaje descriptivo que explica qu\xE9 ha ocurrido y qu\xE9 puede hacer el usuario."
                }), e.anatomy.action && (0, w.jsx)("div", {
                    style: {
                        marginTop: 8,
                        fontWeight: 500,
                        textDecoration: "underline",
                        textUnderlineOffset: 3
                    },
                    children: "Ver detalles"
                })]
            }), e.anatomy.close && (0, w.jsx)("span", {
                style: {
                    opacity: .6,
                    lineHeight: 1
                },
                children: "\xD7"
            })]
        })
    }

    function VC(t, e) {
        let n = e.props,
            l = {
                Square: ne(t, "xs"),
                Rounded: ne(t, "md"),
                Circle: "999px"
            } [e.anatomy.shape],
            a = (i, u, o) => (0, w.jsx)("span", {
                style: {
                    minWidth: n.size,
                    height: n.size,
                    padding: "0 6px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: l,
                    fontSize: H(n.fontSize),
                    fontFamily: t.body,
                    background: u ? t.P[t.dark ? 400 : 600] : e.state === "Hover" && i === "3" ? t.dark ? t.N[800] : t.N[100] : "transparent",
                    color: u ? wl(t.P[t.dark ? 400 : 600]) : o ? t.s.textMuted : t.s.text,
                    border: `1px solid ${u?"transparent":t.s.border}`,
                    opacity: o ? .45 : 1
                },
                children: i
            }, i + String(u));
        return e.variant === "Compact" ? (0, w.jsxs)("div", {
            style: {
                display: "flex",
                gap: H(n.gap),
                alignItems: "center",
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                color: t.s.text
            },
            children: [a("\u2039", !1, !0), (0, w.jsx)("span", {
                children: "2 / 10"
            }), a("\u203A", !1, !1)]
        }) : e.variant === "Simple" ? (0, w.jsxs)("div", {
            style: {
                display: "flex",
                gap: H(n.gap),
                alignItems: "center",
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                color: t.s.textMuted
            },
            children: [a("\u2039 Anterior", !1, !0), (0, w.jsx)("span", {
                style: {
                    padding: "0 8px"
                },
                children: "P\xE1gina 2 de 10"
            }), a("Siguiente \u203A", !1, !1)]
        }) : (0, w.jsxs)("div", {
            style: {
                display: "flex",
                gap: H(n.gap),
                alignItems: "center"
            },
            children: [a("\u2039", !1, !0), a("1", !1), a("2", !0), a("3", !1), a("\u2026", !1, !0), a("10", !1), a("\u203A", !1)]
        })
    }

    function JC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Checked",
            i = l === "Disabled",
            u = l === "Error",
            o = t.P[t.dark ? 400 : 600];
        return (0, w.jsxs)("label", {
            style: {
                display: "inline-flex",
                gap: H(n.gap),
                alignItems: "flex-start",
                opacity: i ? .45 : 1,
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                color: t.s.text,
                flexDirection: e.anatomy.layout === "Control derecha" ? "row-reverse" : "row",
                justifyContent: e.anatomy.layout === "Control derecha" ? "space-between" : "flex-start",
                minWidth: e.anatomy.layout === "Control derecha" ? 220 : 0
            },
            children: [(0, w.jsx)("span", {
                style: {
                    width: n.size,
                    height: n.size,
                    borderRadius: 999,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    border: `${n.borderWidth}px solid ${u?t.sem.error[600]:a?o:l==="Hover"?t.N[t.dark?400:500]:t.s.border}`,
                    background: t.s.surface,
                    boxShadow: l === "Focus" ? `0 0 0 3px ${Xn(t.P[500],.3)}` : "none"
                },
                children: a && (0, w.jsx)("span", {
                    style: {
                        width: n.size * n.dotRatio,
                        height: n.size * n.dotRatio,
                        borderRadius: 999,
                        background: o,
                        display: "block"
                    }
                })
            }), e.anatomy.label !== !1 && (0, w.jsxs)("span", {
                children: [(0, w.jsx)("span", {
                    children: "Opci\xF3n de radio"
                }), e.anatomy.helper && (0, w.jsx)("span", {
                    style: {
                        display: "block",
                        fontSize: H(t.ty.caption.size),
                        color: u ? t.sem.error[600] : t.s.textMuted,
                        marginTop: 2
                    },
                    children: "Texto de ayuda opcional"
                })]
            })]
        })
    }

    function WC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Disabled",
            i = a ? t.N[t.dark ? 600 : 400] : t.P[t.dark ? 400 : 600],
            u = 62,
            o = 26,
            r = c => (0, w.jsx)("span", {
                style: {
                    position: "absolute",
                    left: `${c}%`,
                    top: "50%",
                    transform: "translate(-50%,-50%)",
                    width: n.thumbSize,
                    height: n.thumbSize,
                    borderRadius: 999,
                    background: t.s.surface,
                    border: `2px solid ${i}`,
                    boxShadow: l === "Active / Dragging" ? `0 0 0 6px ${Xn(t.P[500],.18)}` : t.sh[n.thumbShadow] || t.sh.sm
                }
            });
        return (0, w.jsxs)("div", {
            style: {
                width: 300,
                fontFamily: t.body,
                opacity: a ? .5 : 1
            },
            children: [e.anatomy.label && (0, w.jsxs)("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: H(t.ty["body-s"].size),
                    color: t.s.text,
                    marginBottom: 10
                },
                children: [(0, w.jsx)("span", {
                    children: "Volumen"
                }), e.anatomy.value && (0, w.jsx)("span", {
                    style: {
                        color: t.s.textMuted
                    },
                    children: "62"
                })]
            }), (0, w.jsxs)("div", {
                style: {
                    position: "relative",
                    height: Math.max(n.thumbSize, 20),
                    display: "flex",
                    alignItems: "center"
                },
                children: [(0, w.jsx)("span", {
                    style: {
                        position: "absolute",
                        left: 0,
                        right: 0,
                        height: n.trackHeight,
                        borderRadius: 999,
                        background: t.dark ? t.N[700] : t.N[200]
                    }
                }), (0, w.jsx)("span", {
                    style: {
                        position: "absolute",
                        left: e.variant === "Dual thumb" ? `${o}%` : 0,
                        width: e.variant === "Dual thumb" ? `${u-o}%` : `${u}%`,
                        height: n.trackHeight,
                        borderRadius: 999,
                        background: i
                    }
                }), e.variant === "Dual thumb" && r(o), r(u)]
            }), e.variant === "Discrete" && e.anatomy.ticks && (0, w.jsx)("div", {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 6
                },
                children: [0, 1, 2, 3, 4, 5].map(c => (0, w.jsx)("span", {
                    style: {
                        width: 1,
                        height: 5,
                        background: t.s.border
                    }
                }, c))
            })]
        })
    }

    function IC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Typing" || l === "Loading";
        return (0, w.jsxs)("div", {
            style: {
                width: 320,
                fontFamily: t.body,
                position: "relative"
            },
            children: [(0, w.jsxs)("div", {
                style: {
                    height: n.height,
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: `0 ${H(n.padX)}`,
                    background: t.s.surface,
                    borderRadius: ne(t, n.radiusToken || "md"),
                    border: `1px solid ${l==="Focus"||a?t.P[t.dark?400:600]:t.s.border}`,
                    boxShadow: l === "Focus" || a ? `0 0 0 3px ${Xn(t.P[500],.26)}` : "none"
                },
                children: [e.anatomy.icon && (0, w.jsx)("span", {
                    style: {
                        color: t.s.textMuted,
                        display: "flex"
                    },
                    children: (0, w.jsxs)("svg", {
                        width: n.fontSize + 2,
                        height: n.fontSize + 2,
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        strokeWidth: "2",
                        children: [(0, w.jsx)("circle", {
                            cx: "11",
                            cy: "11",
                            r: "7"
                        }), (0, w.jsx)("path", {
                            d: "m20 20-3.2-3.2"
                        })]
                    })
                }), (0, w.jsx)("span", {
                    style: {
                        flex: 1,
                        fontSize: H(n.fontSize),
                        color: a ? t.s.text : t.s.textMuted
                    },
                    children: a ? "design sys" : "Buscar\u2026"
                }), l === "Loading" && (0, w.jsx)("span", {
                    style: {
                        color: t.s.textMuted,
                        display: "flex"
                    },
                    children: (0, w.jsx)(k2, {
                        size: n.fontSize
                    })
                }), (l === "Clearable" || a && l !== "Loading") && e.anatomy.clear && (0, w.jsx)("span", {
                    style: {
                        color: t.s.textMuted
                    },
                    children: "\xD7"
                }), e.anatomy.shortcut && l === "Default" && (0, w.jsx)("span", {
                    style: {
                        fontSize: H(t.ty.caption.size),
                        color: t.s.textMuted,
                        border: `1px solid ${t.s.border}`,
                        borderRadius: ne(t, "xs"),
                        padding: "1px 5px"
                    },
                    children: "\u2318K"
                })]
            }), a && e.anatomy.autocomplete && (0, w.jsx)("div", {
                style: {
                    position: "absolute",
                    top: n.height + 6,
                    left: 0,
                    right: 0,
                    background: t.s.surface,
                    border: `1px solid ${t.s.border}`,
                    borderRadius: ne(t, "md"),
                    boxShadow: t.sh.lg,
                    overflow: "hidden",
                    zIndex: 4
                },
                children: ["design system", "design tokens", "design ops"].map((i, u) => (0, w.jsx)("div", {
                    style: {
                        padding: "8px 12px",
                        fontSize: H(t.ty["body-s"].size),
                        color: t.s.text,
                        background: u === 0 ? t.dark ? t.N[800] : t.N[50] : "transparent"
                    },
                    children: i
                }, i))
            })]
        })
    }

    function KC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "On",
            i = l === "Disabled",
            u = t.P[t.dark ? 400 : 600];
        return (0, w.jsxs)("label", {
            style: {
                display: "inline-flex",
                alignItems: "center",
                gap: H(n.gap),
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                color: t.s.text,
                opacity: i ? .45 : 1
            },
            children: [(0, w.jsx)("span", {
                style: {
                    width: n.trackW,
                    height: n.trackH,
                    borderRadius: 999,
                    position: "relative",
                    flexShrink: 0,
                    background: a ? u : l === "Hover" ? t.dark ? t.N[600] : t.N[400] : t.dark ? t.N[700] : t.N[300],
                    boxShadow: l === "Focus" ? `0 0 0 3px ${Xn(t.P[500],.3)}` : "none",
                    transition: ".16s",
                    display: "flex",
                    alignItems: "center",
                    padding: n.trackPad
                },
                children: (0, w.jsx)("span", {
                    style: {
                        width: n.thumb,
                        height: n.thumb,
                        borderRadius: 999,
                        background: "#fff",
                        boxShadow: t.sh.sm,
                        transform: a ? `translateX(${n.trackW-n.thumb-n.trackPad*2}px)` : "none",
                        transition: ".16s",
                        display: "grid",
                        placeItems: "center",
                        fontSize: n.thumb * .55,
                        color: u,
                        lineHeight: 1
                    },
                    children: e.anatomy.icons ? a ? "\u2713" : "\xD7" : null
                })
            }), e.anatomy.label && (0, w.jsx)("span", {
                children: "Activar notificaciones"
            })]
        })
    }

    function PC(t, e) {
        let n = e.props,
            l = e.state,
            a = l === "Selected / Active",
            i = l === "Disabled",
            u = a ? t.P[t.dark ? 700 : 100] : l === "Hover" ? t.dark ? t.N[700] : t.N[100] : t.dark ? t.N[800] : t.N[50];
        return (0, w.jsxs)("span", {
            style: {
                display: "inline-flex",
                alignItems: "center",
                gap: H(n.gap),
                background: u,
                color: a ? t.dark ? t.P[100] : t.P[800] : t.s.text,
                opacity: i ? .45 : 1,
                border: `1px solid ${a?t.P[t.dark?500:300]:t.s.border}`,
                borderRadius: e.anatomy.shape === "Pill" ? "999px" : ne(t, "md"),
                padding: `${H(n.padY)} ${H(n.padX)}`,
                fontFamily: t.body,
                fontSize: H(n.fontSize),
                boxShadow: l === "Focus" ? `0 0 0 3px ${Xn(t.P[500],.28)}` : "none"
            },
            children: [e.anatomy.avatar && (0, w.jsx)("span", {
                style: {
                    width: n.fontSize + 4,
                    height: n.fontSize + 4,
                    borderRadius: 999,
                    background: t.SEC[t.dark ? 500 : 300],
                    display: "block"
                }
            }), (0, w.jsx)("span", {
                children: e.variant === "Filter tag" ? "Filtro: Activos" : "Etiqueta"
            }), e.anatomy.close && e.variant !== "Read-only tag" && (0, w.jsx)("span", {
                style: {
                    opacity: .6
                },
                children: "\xD7"
            })]
        })
    }

    function qC(t, e) {
        let n = e.props,
            l = ["D\xEDa", "Semana", "Mes"],
            a = e.anatomy.style === "Segmented";
        return (0, w.jsx)("div", {
            style: {
                display: "inline-flex",
                gap: a ? 0 : H(n.gap),
                padding: a ? n.trackPad : 0,
                background: a ? t.dark ? t.N[800] : t.N[100] : "transparent",
                borderRadius: ne(t, "md"),
                border: a ? `1px solid ${t.s.border}` : "none"
            },
            children: l.map((i, u) => {
                let o = e.state === "Selected" ? u === 1 : u === 0,
                    r = e.state === "Hover" && u === 2,
                    c = e.state === "Disabled";
                return (0, w.jsxs)("span", {
                    style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: `${H(n.padY)} ${H(n.padX)}`,
                        fontFamily: t.body,
                        fontSize: H(n.fontSize),
                        borderRadius: ne(t, a ? "sm" : "md"),
                        opacity: c ? .45 : 1,
                        background: o ? a ? t.s.surface : t.P[t.dark ? 400 : 600] : r ? t.dark ? t.N[700] : t.N[200] : "transparent",
                        color: o ? a ? t.s.text : wl(t.P[t.dark ? 400 : 600]) : t.s.textMuted,
                        border: a ? "none" : `1px solid ${o?"transparent":t.s.border}`,
                        boxShadow: o && a ? t.sh.sm : "none",
                        fontWeight: o ? 500 : 400
                    },
                    children: [e.anatomy.content !== "Solo texto" && (0, w.jsx)(da, {
                        size: n.fontSize
                    }), e.anatomy.content !== "Solo icono" && i]
                }, i)
            })
        })
    }

    function jC(t, e) {
        let n = e.props,
            l = e.variant === "Dark",
            a = e.variant === "Accent" ? t.P[t.dark ? 400 : 600] : l ? t.dark ? t.N[700] : t.N[900] : t.s.surface,
            i = e.variant === "Light" ? t.s.text : wl(a),
            u = e.anatomy.position,
            o = {
                position: "absolute",
                width: n.arrowSize,
                height: n.arrowSize,
                background: a,
                transform: "rotate(45deg)",
                border: e.variant === "Light" ? `1px solid ${t.s.border}` : "none",
                ...u === "Top" ? {
                    bottom: -n.arrowSize / 2,
                    left: "50%",
                    marginLeft: -n.arrowSize / 2
                } : u === "Bottom" ? {
                    top: -n.arrowSize / 2,
                    left: "50%",
                    marginLeft: -n.arrowSize / 2
                } : u === "Left" ? {
                    right: -n.arrowSize / 2,
                    top: "50%",
                    marginTop: -n.arrowSize / 2
                } : {
                    left: -n.arrowSize / 2,
                    top: "50%",
                    marginTop: -n.arrowSize / 2
                }
            };
        return (0, w.jsx)("div", {
            style: {
                position: "relative",
                display: "inline-block"
            },
            children: (0, w.jsxs)("div", {
                style: {
                    position: "relative",
                    background: a,
                    color: i,
                    maxWidth: n.maxWidth,
                    padding: `${H(n.padY)} ${H(n.padX)}`,
                    borderRadius: ne(t, n.radiusToken || "sm"),
                    fontFamily: t.body,
                    fontSize: H(n.fontSize),
                    lineHeight: 1.5,
                    boxShadow: t.sh.md,
                    border: e.variant === "Light" ? `1px solid ${t.s.border}` : "none",
                    display: "flex",
                    gap: 7,
                    alignItems: "flex-start"
                },
                children: [e.anatomy.icon && (0, w.jsx)("span", {
                    style: {
                        marginTop: 1,
                        display: "flex"
                    },
                    children: (0, w.jsx)(da, {
                        size: n.fontSize
                    })
                }), (0, w.jsx)("span", {
                    children: "Texto explicativo del tooltip"
                }), e.anatomy.arrow && (0, w.jsx)("i", {
                    style: o
                })]
            })
        })
    }
    var be = (t, e, n) => ({
            label: t,
            type: "select",
            options: e,
            def: n
        }),
        ot = (t, e) => ({
            label: t,
            type: "bool",
            def: e
        }),
        Tn = [{
            key: "accordion",
            name: "Accordion",
            render: HC,
            variants: ["Bordered", "Separated Cards", "Flush"],
            states: ["Collapsed", "Expanded", "Hover", "Disabled"],
            sizes: null,
            anatomy: {
                iconSide: be("Posici\xF3n del icono", ["Derecha", "Izquierda"], "Derecha"),
                iconType: be("Tipo de icono", ["Chevron", "Plus / Minus"], "Chevron")
            },
            props: t => ({
                padX: t.sp.md,
                padY: t.sp.sm,
                gap: t.sp.xs,
                iconSize: 14
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                gap: "Gap",
                iconSize: "Tama\xF1o icono"
            }
        }, {
            key: "badge",
            name: "Badge",
            render: UC,
            variants: ["Solid", "Soft / Subtle", "Outline"],
            intentions: ["Neutral", "Primary", "Success", "Warning", "Error", "Info"],
            sizes: ["SM", "MD"],
            states: null,
            anatomy: {
                anatomy: be("Anatom\xEDa", ["Solo texto", "Punto + texto", "Solo punto", "Con cierre (X)"], "Solo texto"),
                shape: be("Forma", ["Full", "Sharp"], "Full")
            },
            props: (t, e) => ({
                padX: Math.round(t.sp.xs * e * 1.4),
                padY: Math.round(t.sp["3xs"] * e),
                gap: Math.round(t.sp["3xs"] * e * 1.2),
                fontSize: Math.round(t.ty.caption.size * e)
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                gap: "Gap",
                fontSize: "Font size"
            }
        }, {
            key: "button",
            name: "Button",
            render: LC,
            variants: ["Primary", "Secondary", "Tertiary", "Destructive"],
            sizes: ["SM", "MD", "LG"],
            states: ["Default", "Hover", "Focus", "Active", "Disabled", "Loading"],
            anatomy: {
                icon: be("Icono", ["Ninguno", "Izquierda", "Derecha", "Solo icono"], "Ninguno"),
                width: be("Ancho", ["Hug", "Full width"], "Hug")
            },
            props: (t, e) => ({
                padX: Math.round(t.sp.sm * e * 1.6),
                padY: Math.round(t.sp.xs * e),
                gap: Math.round(t.sp.xs * e * .75),
                fontSize: Math.round(t.ty["body-s"].size * e),
                iconSize: Math.round(t.ty["body-s"].size * e),
                radiusToken: "md"
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                gap: "Gap",
                fontSize: "Font size",
                iconSize: "Tama\xF1o icono",
                radiusToken: "Radio (token)"
            }
        }, {
            key: "checkbox",
            name: "Checkbox",
            render: FC,
            variants: null,
            sizes: ["SM", "MD"],
            states: ["Unchecked", "Checked", "Indeterminate", "Hover", "Focus", "Disabled", "Error"],
            anatomy: {
                layout: be("Layout", ["Control izquierda", "Control derecha"], "Control izquierda"),
                helper: ot("Texto de ayuda", !1),
                check: be("Estilo del check", ["Grueso", "Fino"], "Grueso")
            },
            props: (t, e) => ({
                size: Math.round(18 * e),
                radius: 3,
                borderWidth: 1.5,
                gap: Math.round(t.sp.xs * e),
                fontSize: Math.round(t.ty["body-s"].size * e)
            }),
            propMeta: {
                size: "Tama\xF1o",
                radius: "Border radius",
                borderWidth: "Border width",
                gap: "Gap",
                fontSize: "Font size"
            }
        }, {
            key: "dropdown",
            name: "Dropdown",
            render: YC,
            variants: null,
            sizes: ["SM", "MD", "LG"],
            states: ["Default", "Hover", "Focus", "Open", "Disabled", "Error"],
            anatomy: {
                search: ot("Buscador interno", !1),
                checkmark: ot("Check en seleccionado", !0),
                categories: ot("Categor\xEDas / divisores", !1),
                itemIcon: ot("Icono en el item", !1),
                itemDesc: ot("Descripci\xF3n en el item", !1),
                itemBadge: ot("Badge indicador", !1)
            },
            props: (t, e) => ({
                height: Math.round(38 * e),
                padX: Math.round(t.sp.sm * e),
                fontSize: Math.round(t.ty["body-s"].size * e),
                itemPadX: Math.round(t.sp.sm * e),
                itemPadY: Math.round(t.sp.xs * e),
                maxHeight: 220,
                elevation: "lg",
                menuRadiusToken: "md"
            }),
            propMeta: {
                height: "Altura",
                padX: "Padding X",
                fontSize: "Font size",
                itemPadX: "Item padding X",
                itemPadY: "Item padding Y",
                maxHeight: "Max-height men\xFA",
                elevation: "Elevaci\xF3n men\xFA",
                menuRadiusToken: "Radio men\xFA"
            }
        }, {
            key: "input",
            name: "Input",
            render: GC,
            variants: null,
            sizes: ["SM", "MD", "LG"],
            states: ["Default", "Hover", "Focus", "Typing", "Disabled", "Read-only", "Error", "Success"],
            anatomy: {
                label: ot("Label", !0),
                labelLayout: be("Layout del label", ["Arriba", "Izquierda", "Floating"], "Arriba"),
                helper: ot("Texto de ayuda", !0),
                leadingIcon: ot("Icono inicial", !1),
                trailingIcon: ot("Icono final", !1),
                counter: ot("Contador", !1)
            },
            props: (t, e) => ({
                height: Math.round(38 * e),
                padX: Math.round(t.sp.sm * e),
                fontSize: Math.round(t.ty["body-s"].size * e),
                borderWidth: 1,
                radiusToken: "sm"
            }),
            propMeta: {
                height: "Altura",
                padX: "Padding X",
                fontSize: "Font size",
                borderWidth: "Border width",
                radiusToken: "Radio (token)"
            }
        }, {
            key: "link",
            name: "Link",
            render: XC,
            variants: ["Primary", "Neutral", "Inline", "Standalone"],
            sizes: ["SM", "MD", "LG"],
            states: ["Default", "Hover", "Focus", "Active", "Visited"],
            anatomy: {
                underline: be("Subrayado", ["Siempre", "En hover", "Nunca"], "En hover"),
                icon: be("Icono", ["Ninguno", "Izquierda", "External"], "Ninguno")
            },
            props: (t, e) => ({
                fontSize: Math.round(t.ty["body-m"].size * e),
                gap: 5,
                underlineOffset: 3
            }),
            propMeta: {
                fontSize: "Font size",
                gap: "Gap",
                underlineOffset: "Underline offset"
            }
        }, {
            key: "modal",
            name: "Modal",
            render: ZC,
            previewAxis: "none",
            variants: null,
            sizes: ["Small", "Medium", "Large", "Full screen"],
            states: null,
            anatomy: {
                header: ot("T\xEDtulo de cabecera", !0),
                close: ot("Bot\xF3n de cierre", !0),
                scroll: ot("Scroll en el body", !1),
                footer: ot("Footer fijo", !0)
            },
            props: t => ({
                padX: t.sp.lg,
                padY: t.sp.md,
                radiusToken: "xl",
                elevation: "xl",
                backdropOpacity: .45,
                backdropBlur: 0
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                radiusToken: "Radio (token)",
                elevation: "Elevaci\xF3n",
                backdropOpacity: "Opacidad backdrop",
                backdropBlur: "Blur backdrop"
            }
        }, {
            key: "notification",
            name: "Notification",
            render: QC,
            variants: ["Solid", "Soft / Subtle", "Left-border accent"],
            intentions: ["Info", "Success", "Warning", "Error / Critical"],
            sizes: null,
            states: null,
            anatomy: {
                icon: ot("Icono de estado", !0),
                title: ot("T\xEDtulo", !0),
                desc: ot("Descripci\xF3n", !0),
                action: ot("Acci\xF3n", !1),
                close: ot("Icono de cierre", !0)
            },
            props: t => ({
                padX: t.sp.md,
                padY: t.sp.sm,
                gap: t.sp.xs,
                radiusToken: "md",
                elevation: "sm"
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                gap: "Gap",
                radiusToken: "Radio (token)",
                elevation: "Elevaci\xF3n"
            }
        }, {
            key: "pagination",
            name: "Pagination",
            render: VC,
            variants: ["Full", "Simple", "Compact"],
            sizes: ["SM", "MD"],
            states: ["Default", "Hover"],
            anatomy: {
                shape: be("Forma del bot\xF3n", ["Square", "Rounded", "Circle"], "Rounded")
            },
            props: (t, e) => ({
                size: Math.round(32 * e),
                gap: Math.round(t.sp["3xs"] * e * 1.5),
                fontSize: Math.round(t.ty["body-s"].size * e)
            }),
            propMeta: {
                size: "Tama\xF1o",
                gap: "Gap",
                fontSize: "Font size"
            }
        }, {
            key: "radio",
            name: "Radio",
            render: JC,
            variants: null,
            sizes: ["SM", "MD"],
            states: ["Unchecked", "Checked", "Hover", "Focus", "Disabled", "Error"],
            anatomy: {
                layout: be("Layout", ["Control izquierda", "Control derecha"], "Control izquierda"),
                helper: ot("Texto de ayuda", !1)
            },
            props: (t, e) => ({
                size: Math.round(18 * e),
                dotRatio: .45,
                borderWidth: 1.5,
                gap: Math.round(t.sp.xs * e),
                fontSize: Math.round(t.ty["body-s"].size * e)
            }),
            propMeta: {
                size: "Tama\xF1o",
                dotRatio: "Ratio del punto",
                borderWidth: "Border width",
                gap: "Gap",
                fontSize: "Font size"
            }
        }, {
            key: "search",
            name: "Search",
            render: IC,
            variants: null,
            sizes: ["SM", "MD", "LG"],
            states: ["Default", "Focus", "Typing", "Loading", "Clearable"],
            anatomy: {
                icon: ot("Icono de b\xFAsqueda", !0),
                shortcut: ot("Badge de atajo", !0),
                clear: ot("Bot\xF3n de limpiar", !0),
                autocomplete: ot("Autocompletado", !0)
            },
            props: (t, e) => ({
                height: Math.round(38 * e),
                padX: Math.round(t.sp.sm * e),
                fontSize: Math.round(t.ty["body-s"].size * e),
                radiusToken: "md"
            }),
            propMeta: {
                height: "Altura",
                padX: "Padding X",
                fontSize: "Font size",
                radiusToken: "Radio (token)"
            }
        }, {
            key: "slider",
            name: "Slider",
            render: WC,
            variants: ["Continuous", "Discrete", "Dual thumb"],
            sizes: null,
            states: ["Default", "Hover", "Active / Dragging", "Disabled"],
            anatomy: {
                label: ot("Label", !0),
                value: ot("Valor actual", !0),
                ticks: ot("Marcas / ticks", !1)
            },
            props: () => ({
                trackHeight: 4,
                thumbSize: 18,
                thumbShadow: "sm"
            }),
            propMeta: {
                trackHeight: "Alto del track",
                thumbSize: "Tama\xF1o del thumb",
                thumbShadow: "Sombra del thumb"
            }
        }, {
            key: "switch",
            name: "Switch",
            render: KC,
            variants: null,
            sizes: ["SM", "MD"],
            states: ["Off", "On", "Hover", "Focus", "Disabled"],
            anatomy: {
                label: ot("Label", !0),
                icons: ot("Iconos dentro del track", !1)
            },
            props: (t, e) => ({
                trackW: Math.round(40 * e),
                trackH: Math.round(22 * e),
                thumb: Math.round(16 * e),
                trackPad: 3,
                gap: Math.round(t.sp.xs * e),
                fontSize: Math.round(t.ty["body-s"].size * e)
            }),
            propMeta: {
                trackW: "Ancho del track",
                trackH: "Alto del track",
                thumb: "Tama\xF1o del thumb",
                trackPad: "Padding del track",
                gap: "Gap",
                fontSize: "Font size"
            }
        }, {
            key: "tags",
            name: "Tags",
            render: PC,
            variants: ["Input tag", "Filter tag", "Read-only tag"],
            sizes: ["SM", "MD"],
            states: ["Default", "Hover", "Selected / Active", "Focus", "Disabled"],
            anatomy: {
                avatar: ot("Avatar / icono inicial", !1),
                close: ot("Bot\xF3n de cierre", !0),
                shape: be("Forma", ["Rounded", "Pill"], "Pill")
            },
            props: (t, e) => ({
                padX: Math.round(t.sp.xs * e * 1.5),
                padY: Math.round(t.sp["3xs"] * e * 1.2),
                gap: Math.round(t.sp["3xs"] * e * 1.5),
                fontSize: Math.round(t.ty["body-s"].size * e)
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                gap: "Gap",
                fontSize: "Font size"
            }
        }, {
            key: "toggle",
            name: "Toggle",
            render: qC,
            variants: ["Single select", "Multi-select"],
            sizes: ["SM", "MD", "LG"],
            states: ["Default", "Hover", "Selected", "Disabled"],
            anatomy: {
                content: be("Contenido", ["Solo texto", "Solo icono", "Icono + texto"], "Solo texto"),
                style: be("Estilo", ["Segmented", "Outlined"], "Segmented")
            },
            props: (t, e) => ({
                padX: Math.round(t.sp.sm * e * 1.3),
                padY: Math.round(t.sp.xs * e * .85),
                gap: Math.round(t.sp["3xs"] * e * 2),
                trackPad: 3,
                fontSize: Math.round(t.ty["body-s"].size * e)
            }),
            propMeta: {
                padX: "Padding X",
                padY: "Padding Y",
                gap: "Gap",
                trackPad: "Padding del track",
                fontSize: "Font size"
            }
        }, {
            key: "tooltip",
            name: "Tooltip",
            render: jC,
            variants: ["Light", "Dark", "Accent"],
            sizes: null,
            states: null,
            anatomy: {
                position: be("Posici\xF3n", ["Top", "Bottom", "Left", "Right"], "Top"),
                icon: ot("Con icono", !1),
                arrow: ot("Flecha", !0)
            },
            props: t => ({
                maxWidth: 240,
                padX: t.sp.xs,
                padY: t.sp["2xs"],
                radiusToken: "sm",
                fontSize: t.ty.caption.size,
                arrowSize: 8
            }),
            propMeta: {
                maxWidth: "Max-width",
                padX: "Padding X",
                padY: "Padding Y",
                radiusToken: "Radio (token)",
                fontSize: "Font size",
                arrowSize: "Tama\xF1o flecha"
            }
        }],
        Y0 = Object.fromEntries(Tn.map(t => [t.key, t]));

    function to(t, e) {
        let n = t.sizes ? t.sizes.includes("MD") ? "MD" : t.sizes[1] || t.sizes[0] : null,
            l = N2[n] || 1,
            a = {};
        return Object.entries(t.anatomy || {}).forEach(([i, u]) => {
            a[i] = u.def
        }), {
            variant: t.variants ? t.variants[0] : null,
            intention: t.intentions ? t.intentions[1] || t.intentions[0] : null,
            size: n,
            state: t.states ? t.states[0] : null,
            anatomy: a,
            props: t.props(e, l),
            note: ""
        }
    }

    function eo(t, e, n, l) {
        let a = t.props(e, N2[n] || 1),
            i = {
                ...a
            };
        return Object.keys(a).forEach(u => {
            typeof a[u] == "string" && (i[u] = l[u] ?? a[u])
        }), i
    }
    var lc = t => {
        let e = [],
            n = (t.variants?.length || 0) * (t.intentions?.length || 1);
        return n && e.push(`${n} variante${n>1?"s":""}`), t.sizes && e.push(`${t.sizes.length} tama\xF1o${t.sizes.length>1?"s":""}`), t.states && e.push(`${t.states.length} estados`), e.join(" \xB7 ")
    };
    var Ji = ht(Je());
    var L = ht(te());

    function $C({
        ds: t
    }) {
        let e = t.tokens?.palette,
            n = e ? [e.primary?.[600], e.secondary?.[600] || e.primary?.[400], e.neutral?.[400]].filter(Boolean) : ["#26241F", "#46433F", "#9C978F"],
            l = t.brand?.fonts?.heading || "IBM Plex Serif";
        return (0, L.jsxs)("div", {
            className: "ds-card-prev",
            children: [(0, L.jsx)("div", {
                className: "row gap10",
                children: n.map((a, i) => (0, L.jsx)("span", {
                    style: {
                        width: 17,
                        height: 17,
                        borderRadius: 99,
                        background: a,
                        display: "block"
                    }
                }, i))
            }), (0, L.jsxs)("div", {
                className: "row gap8",
                children: [(0, L.jsx)("span", {
                    style: {
                        fontFamily: `"${l}", Georgia, serif`,
                        fontSize: 15,
                        color: "var(--ink-2)"
                    },
                    children: "Aa"
                }), (0, L.jsx)("span", {
                    style: {
                        width: 62,
                        height: 1,
                        background: "var(--line-2)",
                        display: "block"
                    }
                })]
            })]
        })
    }

    function G0({
        systems: t,
        onNew: e,
        onOpen: n,
        onDuplicate: l,
        onDelete: a,
        onExport: i,
        onRename: u
    }) {
        let [o, r] = (0, Ji.useState)(""), [c, f] = (0, Ji.useState)("All"), [s, d] = (0, Ji.useState)("grid"), [g, x] = (0, Ji.useState)(null), {
            open: m,
            setOpen: E,
            ref: v
        } = b2(), h = (0, Ji.useMemo)(() => t.filter(p => (c === "All" || p.status === c) && p.name.toLowerCase().includes(o.trim().toLowerCase())), [t, o, c]), y = t.length === 0;
        return (0, L.jsx)("div", {
            className: "scroller",
            children: (0, L.jsx)("div", {
                className: "wrap",
                style: {
                    paddingTop: 32,
                    paddingBottom: 64,
                    maxWidth: 1440
                },
                children: y ? (0, L.jsxs)("div", {
                    className: "empty",
                    style: {
                        minHeight: "58vh"
                    },
                    children: [(0, L.jsxs)("svg", {
                        width: "130",
                        height: "92",
                        viewBox: "0 0 130 92",
                        fill: "none",
                        "aria-hidden": "true",
                        children: [(0, L.jsx)("rect", {
                            x: "1",
                            y: "1",
                            width: "128",
                            height: "90",
                            rx: "3",
                            stroke: "var(--line-2)",
                            strokeDasharray: "5 5"
                        }), (0, L.jsx)("rect", {
                            x: "22",
                            y: "24",
                            width: "34",
                            height: "34",
                            rx: "3",
                            fill: "var(--paper-2)"
                        }), (0, L.jsx)("rect", {
                            x: "64",
                            y: "24",
                            width: "44",
                            height: "8",
                            rx: "2",
                            fill: "var(--paper-2)"
                        }), (0, L.jsx)("rect", {
                            x: "64",
                            y: "38",
                            width: "30",
                            height: "8",
                            rx: "2",
                            fill: "var(--paper-2)"
                        }), (0, L.jsx)("rect", {
                            x: "22",
                            y: "66",
                            width: "86",
                            height: "8",
                            rx: "2",
                            fill: "var(--paper-2)"
                        })]
                    }), (0, L.jsxs)("div", {
                        children: [(0, L.jsx)("h1", {
                            className: "page-title",
                            style: {
                                fontSize: 30
                            },
                            children: "Todav\xEDa no has creado ning\xFAn sistema"
                        }), (0, L.jsx)("p", {
                            className: "page-sub",
                            children: "Genera foundations y una librer\xEDa de componentes a partir de los datos de tu marca."
                        })]
                    }), (0, L.jsxs)("button", {
                        className: "btn btn-primary",
                        onClick: e,
                        style: {
                            marginTop: 6
                        },
                        children: [(0, L.jsx)(X.Plus, {
                            size: 16
                        }), " New Design System"]
                    })]
                }) : (0, L.jsxs)(L.Fragment, {
                    children: [(0, L.jsxs)("div", {
                        className: "between",
                        style: {
                            marginBottom: 24,
                            gap: 16
                        },
                        children: [(0, L.jsxs)("div", {
                            style: {
                                position: "relative",
                                width: 360,
                                maxWidth: "50%"
                            },
                            children: [(0, L.jsx)("span", {
                                style: {
                                    position: "absolute",
                                    left: 12,
                                    top: 11,
                                    color: "var(--ink-3)"
                                },
                                children: (0, L.jsx)(X.Search, {
                                    size: 15
                                })
                            }), (0, L.jsx)("input", {
                                className: "input",
                                style: {
                                    paddingLeft: 34
                                },
                                placeholder: "Search design systems...",
                                value: o,
                                onChange: p => r(p.target.value)
                            })]
                        }), (0, L.jsxs)("div", {
                            className: "row gap12",
                            children: [(0, L.jsxs)("div", {
                                className: "row gap8",
                                children: [(0, L.jsx)("span", {
                                    className: "tiny",
                                    style: {
                                        fontWeight: 600
                                    },
                                    children: "Status:"
                                }), (0, L.jsx)(ee, {
                                    value: c,
                                    onChange: f,
                                    options: ["All", "Draft", "Published"],
                                    style: {
                                        width: 130,
                                        height: 38
                                    }
                                })]
                            }), (0, L.jsxs)("div", {
                                className: "seg",
                                style: {
                                    width: "auto"
                                },
                                children: [(0, L.jsx)("button", {
                                    className: s === "grid" ? "on" : "",
                                    onClick: () => d("grid"),
                                    "aria-label": "Vista de cuadr\xEDcula",
                                    children: (0, L.jsx)(X.Grid, {
                                        size: 16
                                    })
                                }), (0, L.jsx)("button", {
                                    className: s === "list" ? "on" : "",
                                    onClick: () => d("list"),
                                    "aria-label": "Vista de lista",
                                    children: (0, L.jsx)(X.List, {
                                        size: 16
                                    })
                                })]
                            })]
                        })]
                    }), h.length === 0 && (0, L.jsxs)("p", {
                        className: "muted",
                        style: {
                            padding: "40px 0"
                        },
                        children: ['No hay sistemas que coincidan con "', o, '".']
                    }), s === "grid" ? (0, L.jsx)("div", {
                        className: "ds-grid",
                        ref: v,
                        children: h.map(p => (0, L.jsxs)("div", {
                            className: "ds-card",
                            children: [(0, L.jsx)("div", {
                                onClick: () => n(p),
                                style: {
                                    cursor: "pointer"
                                },
                                children: (0, L.jsx)($C, {
                                    ds: p
                                })
                            }), (0, L.jsxs)("div", {
                                className: "ds-card-body",
                                children: [g === p.id ? (0, L.jsx)("input", {
                                    className: "input input-sm",
                                    autoFocus: !0,
                                    defaultValue: p.name,
                                    onBlur: T => {
                                        u(p.id, T.target.value), x(null)
                                    },
                                    onKeyDown: T => {
                                        T.key === "Enter" && T.currentTarget.blur(), T.key === "Escape" && x(null)
                                    },
                                    style: {
                                        marginBottom: 6
                                    }
                                }) : (0, L.jsx)("h3", {
                                    className: "ds-card-name",
                                    onDoubleClick: () => x(p.id),
                                    title: "Doble clic para renombrar",
                                    children: p.name
                                }), (0, L.jsxs)("p", {
                                    className: "tiny muted",
                                    style: {
                                        margin: "3px 0 10px"
                                    },
                                    children: ["Editado ", _0(p.updatedAt)]
                                }), (0, L.jsxs)("div", {
                                    className: "between",
                                    children: [(0, L.jsx)("span", {
                                        className: "tag " + (p.status === "Published" ? "tag-pub" : "tag-draft"),
                                        children: p.status === "Published" ? "Published" : "Draft"
                                    }), (0, L.jsx)("button", {
                                        className: "icon-btn",
                                        onClick: T => {
                                            T.stopPropagation(), E(m === p.id ? null : p.id)
                                        },
                                        "aria-label": "Acciones",
                                        children: (0, L.jsx)(X.Dots, {
                                            size: 16
                                        })
                                    })]
                                })]
                            }), m === p.id && (0, L.jsxs)("div", {
                                className: "menu",
                                children: [(0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), n(p)
                                    },
                                    children: [(0, L.jsx)(X.Pencil, {
                                        size: 14
                                    }), " Edit"]
                                }), (0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), x(p.id)
                                    },
                                    children: [(0, L.jsx)(X.Pencil, {
                                        size: 14
                                    }), " Rename"]
                                }), (0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), l(p)
                                    },
                                    children: [(0, L.jsx)(X.Duplicate, {
                                        size: 14
                                    }), " Duplicate"]
                                }), (0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), i(p)
                                    },
                                    children: [(0, L.jsx)(X.Download, {
                                        size: 14
                                    }), " Export"]
                                }), (0, L.jsxs)("button", {
                                    className: "btn-danger",
                                    onClick: () => {
                                        E(null), a(p)
                                    },
                                    children: [(0, L.jsx)(X.Trash, {
                                        size: 14
                                    }), " Delete"]
                                })]
                            })]
                        }, p.id))
                    }) : (0, L.jsx)("div", {
                        className: "card",
                        ref: v,
                        children: h.map((p, T) => (0, L.jsxs)("div", {
                            className: "between",
                            style: {
                                padding: "14px 18px",
                                borderTop: T ? "1px solid var(--line)" : "none"
                            },
                            children: [(0, L.jsxs)("div", {
                                className: "row gap16",
                                style: {
                                    cursor: "pointer"
                                },
                                onClick: () => n(p),
                                children: [(0, L.jsx)("div", {
                                    className: "row gap6",
                                    children: [p.tokens?.palette?.primary?.[600], p.tokens?.palette?.secondary?.[600], p.tokens?.palette?.neutral?.[400]].filter(Boolean).map((C, k) => (0, L.jsx)("span", {
                                        style: {
                                            width: 14,
                                            height: 14,
                                            borderRadius: 99,
                                            background: C,
                                            display: "block"
                                        }
                                    }, k))
                                }), (0, L.jsx)("span", {
                                    style: {
                                        fontFamily: "var(--serif)",
                                        fontSize: 17
                                    },
                                    children: p.name
                                }), (0, L.jsx)("span", {
                                    className: "tag " + (p.status === "Published" ? "tag-pub" : "tag-draft"),
                                    children: p.status
                                })]
                            }), (0, L.jsxs)("div", {
                                className: "row gap12",
                                children: [(0, L.jsxs)("span", {
                                    className: "tiny muted",
                                    children: ["Editado ", _0(p.updatedAt)]
                                }), (0, L.jsx)("button", {
                                    className: "icon-btn",
                                    onClick: () => E(m === p.id ? null : p.id),
                                    "aria-label": "Acciones",
                                    children: (0, L.jsx)(X.Dots, {
                                        size: 16
                                    })
                                })]
                            }), m === p.id && (0, L.jsxs)("div", {
                                className: "menu",
                                style: {
                                    bottom: "auto",
                                    top: 44
                                },
                                children: [(0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), n(p)
                                    },
                                    children: [(0, L.jsx)(X.Pencil, {
                                        size: 14
                                    }), " Edit"]
                                }), (0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), l(p)
                                    },
                                    children: [(0, L.jsx)(X.Duplicate, {
                                        size: 14
                                    }), " Duplicate"]
                                }), (0, L.jsxs)("button", {
                                    onClick: () => {
                                        E(null), i(p)
                                    },
                                    children: [(0, L.jsx)(X.Download, {
                                        size: 14
                                    }), " Export"]
                                }), (0, L.jsxs)("button", {
                                    className: "btn-danger",
                                    onClick: () => {
                                        E(null), a(p)
                                    },
                                    children: [(0, L.jsx)(X.Trash, {
                                        size: 14
                                    }), " Delete"]
                                })]
                            })]
                        }, p.id))
                    })]
                })
            })
        })
    }
    var X0 = ht(Je());
    var M = ht(te()),
        t4 = ["IBM Plex Serif", "IBM Plex Mono", "IBM Plex Sans", "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Source Sans 3", "Work Sans", "DM Sans", "Manrope", "Nunito", "Playfair Display", "Lora", "Merriweather", "Libre Baskerville", "Space Grotesk", "Space Mono", "JetBrains Mono", "Fira Code", "Karla", "Rubik", "Outfit", "Figtree", "Bricolage Grotesque"],
        ac = ({
            cols: t = 2,
            children: e,
            gap: n = 20
        }) => (0, M.jsx)("div", {
            className: "field-row",
            style: {
                gridTemplateColumns: `repeat(${t}, 1fr)`,
                gap: n
            },
            children: e
        }),
        O2 = ({
            value: t,
            onChange: e,
            listId: n
        }) => (0, M.jsxs)(M.Fragment, {
            children: [(0, M.jsx)("input", {
                className: "input",
                list: n,
                value: t,
                spellCheck: !1,
                placeholder: "Write your Font Name or paste a Google Fonts link",
                onChange: l => e(l.target.value)
            }), (0, M.jsx)("datalist", {
                id: n,
                children: t4.map(l => (0, M.jsx)("option", {
                    value: l
                }, l))
            })]
        });

    function Z0({
        brand: t,
        setBrand: e,
        onGenerate: n,
        generating: l
    }) {
        let a = (0, X0.useRef)(null),
            i = (0, X0.useRef)(null),
            u = d => e({
                ...t,
                ...d
            }),
            o = (d, g) => u({
                colors: {
                    ...t.colors,
                    [d]: g
                }
            }),
            r = (d, g = "logo") => {
                if (!d) return;
                let x = new FileReader;
                x.onload = () => u({
                    [g]: {
                        name: d.name,
                        src: String(x.result)
                    }
                }), x.readAsDataURL(d)
            },
            c = Object.keys(t.colors).filter(d => d !== "primary" && d !== "secondary"),
            f = Object.values(t.colors).every(E2) && !!t.fonts.heading && !!t.fonts.body,
            s = d => `${d.name} (${d.value.toFixed(3)}) \u2014 ${d.desc}`;
        return (0, M.jsx)("div", {
            className: "scroller",
            children: (0, M.jsx)("div", {
                className: "wrap-narrow",
                style: {
                    paddingTop: 40,
                    paddingBottom: 80,
                    maxWidth: 1060
                },
                children: (0, M.jsxs)("div", {
                    className: "panel",
                    style: {
                        padding: "40px 56px 48px"
                    },
                    children: [(0, M.jsx)("h1", {
                        className: "page-title",
                        children: "Set up your brand foundations"
                    }), (0, M.jsx)("p", {
                        className: "page-sub",
                        children: "Configure core tokens before generating your design system component library."
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Brand"
                    }), (0, M.jsxs)(ac, {
                        children: [(0, M.jsx)(Ot, {
                            label: "Brand name",
                            children: (0, M.jsx)("input", {
                                className: "input",
                                placeholder: "Escribe el nombre del cliente",
                                value: t.name,
                                onChange: d => u({
                                    name: d.target.value
                                })
                            })
                        }), (0, M.jsx)(Ot, {
                            label: "Logo",
                            children: (0, M.jsxs)("div", {
                                className: "row gap12",
                                style: {
                                    height: 38
                                },
                                children: [(0, M.jsx)("button", {
                                    className: "btn btn-secondary",
                                    style: {
                                        fontWeight: 600
                                    },
                                    onClick: () => a.current?.click(),
                                    children: "Seleccionar archivo"
                                }), t.logo ? (0, M.jsxs)(M.Fragment, {
                                    children: [(0, M.jsx)("img", {
                                        src: t.logo.src,
                                        alt: "",
                                        style: {
                                            width: 22,
                                            height: 22,
                                            objectFit: "contain"
                                        }
                                    }), (0, M.jsx)("span", {
                                        className: "tiny grow",
                                        style: {
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap"
                                        },
                                        children: t.logo.name
                                    }), (0, M.jsx)("button", {
                                        className: "link-btn tiny",
                                        onClick: () => u({
                                            logo: null
                                        }),
                                        children: "Quitar"
                                    })]
                                }) : (0, M.jsx)("span", {
                                    className: "muted",
                                    children: "Ning\xFAn archivo seleccionado"
                                }), (0, M.jsx)("input", {
                                    ref: a,
                                    type: "file",
                                    accept: "image/*,.svg",
                                    hidden: !0,
                                    onChange: d => r(d.target.files?.[0])
                                })]
                            })
                        })]
                    }), (0, M.jsx)("div", {
                        style: {
                            marginTop: 14
                        },
                        children: (0, M.jsx)(Ku, {
                            checked: t.useLogoDark,
                            onChange: d => u({
                                useLogoDark: d
                            }),
                            label: "Variante de logo para fondos oscuros"
                        })
                    }), t.useLogoDark && (0, M.jsxs)("div", {
                        className: "row gap12",
                        style: {
                            marginTop: 10,
                            height: 38
                        },
                        children: [(0, M.jsx)("button", {
                            className: "btn btn-secondary",
                            onClick: () => i.current?.click(),
                            children: "Seleccionar archivo"
                        }), (0, M.jsx)("span", {
                            className: t.logoDark ? "" : "muted",
                            children: t.logoDark ? t.logoDark.name : "Ning\xFAn archivo seleccionado"
                        }), (0, M.jsx)("input", {
                            ref: i,
                            type: "file",
                            accept: "image/*,.svg",
                            hidden: !0,
                            onChange: d => r(d.target.files?.[0], "logoDark")
                        })]
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Color mode"
                    }), (0, M.jsx)(Gn, {
                        value: t.mode,
                        onChange: d => u({
                            mode: d
                        }),
                        options: [{
                            value: "Light",
                            label: "Light Mode",
                            icon: (0, M.jsx)(X.Sun, {
                                size: 14
                            })
                        }, {
                            value: "Dark",
                            label: "Dark Mode",
                            icon: (0, M.jsx)(X.Moon, {
                                size: 14
                            })
                        }, {
                            value: "Both",
                            label: "Both",
                            icon: (0, M.jsx)(X.Layers, {
                                size: 14
                            })
                        }]
                    }), (0, M.jsx)("div", {
                        style: {
                            marginTop: 14
                        },
                        children: (0, M.jsx)(Ku, {
                            checked: t.highContrast,
                            onChange: d => u({
                                highContrast: d
                            }),
                            label: "High contrast mode \u2014 ensures generated colors meet minimum AAA contrast ratio",
                            hint: t.mode === "Both" ? "Applies independently to each generated mode." : "Applies to the selected mode."
                        })
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Colors"
                    }), (0, M.jsxs)(ac, {
                        cols: 3,
                        children: [(0, M.jsx)(Ot, {
                            label: "Primary color",
                            children: (0, M.jsx)(ra, {
                                value: t.colors.primary,
                                onChange: d => o("primary", d)
                            })
                        }), (0, M.jsx)(Ot, {
                            label: "Secondary color",
                            children: (0, M.jsx)(ra, {
                                value: t.colors.secondary,
                                onChange: d => o("secondary", d)
                            })
                        }), (0, M.jsxs)("div", {
                            className: "row gap16",
                            style: {
                                alignSelf: "end",
                                height: 38
                            },
                            children: [(0, M.jsxs)("button", {
                                className: "link-btn",
                                onClick: () => {
                                    let d = c.length;
                                    o(d === 0 ? "accent" : `custom${d}`, "#7C5CFF")
                                },
                                children: [(0, M.jsx)(X.Plus, {
                                    size: 13,
                                    style: {
                                        verticalAlign: -2
                                    }
                                }), " Add color"]
                            }), (0, M.jsxs)("button", {
                                className: "link-btn",
                                title: "Deriva secundario y acento a partir del primario",
                                onClick: () => {
                                    let d = U0(t.colors.primary);
                                    u({
                                        colors: {
                                            ...t.colors,
                                            secondary: d.secondary,
                                            accent: d.accent
                                        }
                                    })
                                },
                                children: [(0, M.jsx)(X.Sparkle, {
                                    size: 13,
                                    style: {
                                        verticalAlign: -2
                                    }
                                }), " Auto-generate"]
                            })]
                        })]
                    }), c.length > 0 && (0, M.jsx)(ac, {
                        cols: 3,
                        children: c.map(d => (0, M.jsx)(Ot, {
                            label: d,
                            children: (0, M.jsxs)("div", {
                                className: "row gap6",
                                children: [(0, M.jsx)(ra, {
                                    value: t.colors[d],
                                    onChange: g => o(d, g)
                                }), (0, M.jsx)("button", {
                                    className: "icon-btn",
                                    "aria-label": "Eliminar color",
                                    onClick: () => {
                                        let g = {
                                            ...t.colors
                                        };
                                        delete g[d], u({
                                            colors: g
                                        })
                                    },
                                    children: (0, M.jsx)(X.Trash, {
                                        size: 14
                                    })
                                })]
                            })
                        }, d))
                    }), (0, M.jsx)("div", {
                        style: {
                            marginTop: 18
                        },
                        children: (0, M.jsx)(Ot, {
                            label: "Escala de neutros",
                            children: (0, M.jsx)(ee, {
                                value: t.neutralPreset,
                                onChange: d => u({
                                    neutralPreset: d
                                }),
                                options: Object.keys(Ef)
                            })
                        })
                    }), (0, M.jsx)("div", {
                        style: {
                            marginTop: 14
                        },
                        children: (0, M.jsx)(Ku, {
                            checked: t.harmonize,
                            onChange: d => u({
                                harmonize: d
                            }),
                            label: "Armonizar saturaci\xF3n y brillo de los colores sem\xE1nticos con el primario"
                        })
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Typography"
                    }), (0, M.jsxs)(ac, {
                        children: [(0, M.jsx)(Ot, {
                            label: "Primary font family",
                            children: (0, M.jsx)(O2, {
                                listId: "gf-heading",
                                value: t.fonts.heading,
                                onChange: d => u({
                                    fonts: {
                                        ...t.fonts,
                                        heading: d
                                    }
                                })
                            })
                        }), (0, M.jsx)(Ot, {
                            label: "Secondary font family (optional)",
                            children: (0, M.jsx)(O2, {
                                listId: "gf-body",
                                value: t.fonts.body,
                                onChange: d => u({
                                    fonts: {
                                        ...t.fonts,
                                        body: d
                                    }
                                })
                            })
                        })]
                    }), (0, M.jsxs)(ac, {
                        children: [(0, M.jsx)(Ot, {
                            label: "Base font size",
                            style: {
                                marginTop: 18
                            },
                            children: (0, M.jsx)(ee, {
                                value: t.baseSize,
                                onChange: d => u({
                                    baseSize: Number(d)
                                }),
                                options: M2.map(d => ({
                                    value: d.value,
                                    label: `${d.label} - ${d.value}px`
                                }))
                            })
                        }), (0, M.jsx)(Ot, {
                            label: "Scale ratio",
                            style: {
                                marginTop: 18
                            },
                            children: (0, M.jsx)(ee, {
                                value: t.ratio,
                                onChange: d => u({
                                    ratio: Number(d)
                                }),
                                options: z2.map(d => ({
                                    value: d.value,
                                    label: s(d)
                                }))
                            })
                        })]
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Shadows"
                    }), (0, M.jsx)("div", {
                        className: "card-opts",
                        style: {
                            gridTemplateColumns: "repeat(4, 1fr)"
                        },
                        children: Object.keys(Mf).map(d => (0, M.jsx)("button", {
                            className: "card-opt" + (t.shadow === d ? " on" : ""),
                            onClick: () => u({
                                shadow: d
                            }),
                            children: (0, M.jsxs)("div", {
                                className: "between",
                                children: [(0, M.jsx)("span", {
                                    style: {
                                        fontSize: 13
                                    },
                                    children: d
                                }), (0, M.jsx)("span", {
                                    className: "dot"
                                })]
                            })
                        }, d))
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Radius"
                    }), (0, M.jsx)("span", {
                        className: "lbl",
                        children: "Radius style"
                    }), (0, M.jsx)("div", {
                        className: "card-opts",
                        style: {
                            gridTemplateColumns: "repeat(5, 1fr)",
                            marginTop: 8
                        },
                        children: Object.entries(Vi).map(([d, g]) => (0, M.jsxs)("button", {
                            className: "card-opt" + (t.radiusStyle === d ? " on" : ""),
                            onClick: () => u({
                                radiusStyle: d
                            }),
                            children: [(0, M.jsxs)("div", {
                                className: "between",
                                children: [(0, M.jsx)("span", {
                                    style: {
                                        fontSize: 13
                                    },
                                    children: d
                                }), (0, M.jsx)("span", {
                                    className: "dot"
                                })]
                            }), (0, M.jsx)("span", {
                                style: {
                                    display: "grid",
                                    placeItems: "center",
                                    height: 30,
                                    background: "var(--paper-2)",
                                    borderRadius: Sn(g.sample),
                                    fontSize: 10,
                                    letterSpacing: ".08em",
                                    color: "var(--ink-3)"
                                },
                                children: "BUTTON EXAMPLE"
                            })]
                        }, d))
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Breakpoints"
                    }), (0, M.jsxs)("table", {
                        className: "tbl",
                        children: [(0, M.jsx)("thead", {
                            children: (0, M.jsxs)("tr", {
                                children: [(0, M.jsx)("th", {
                                    style: {
                                        width: "32%"
                                    },
                                    children: "Name"
                                }), (0, M.jsx)("th", {
                                    style: {
                                        width: "28%"
                                    },
                                    children: "Min width"
                                }), (0, M.jsx)("th", {
                                    style: {
                                        width: "28%"
                                    },
                                    children: "Max width"
                                }), (0, M.jsx)("th", {})]
                            })
                        }), (0, M.jsx)("tbody", {
                            children: t.breakpoints.map((d, g) => (0, M.jsxs)("tr", {
                                children: [(0, M.jsx)("td", {
                                    children: (0, M.jsx)("input", {
                                        className: "input input-sm",
                                        value: d.name,
                                        onChange: x => {
                                            let m = [...t.breakpoints];
                                            m[g] = {
                                                ...d,
                                                name: x.target.value
                                            }, u({
                                                breakpoints: m
                                            })
                                        }
                                    })
                                }), (0, M.jsx)("td", {
                                    children: (0, M.jsx)(Vt, {
                                        width: "100%",
                                        value: d.min,
                                        onChange: x => {
                                            let m = [...t.breakpoints];
                                            m[g] = {
                                                ...d,
                                                min: x
                                            }, u({
                                                breakpoints: m
                                            })
                                        }
                                    })
                                }), (0, M.jsx)("td", {
                                    children: (0, M.jsx)("input", {
                                        className: "input input-sm mono-num",
                                        value: d.max == null ? "\u221E" : d.max,
                                        onChange: x => {
                                            let m = [...t.breakpoints];
                                            m[g] = {
                                                ...d,
                                                max: x.target.value === "\u221E" || x.target.value === "" ? null : Number(x.target.value)
                                            }, u({
                                                breakpoints: m
                                            })
                                        }
                                    })
                                }), (0, M.jsx)("td", {
                                    style: {
                                        width: 34
                                    },
                                    children: (0, M.jsx)("button", {
                                        className: "icon-btn",
                                        "aria-label": "Eliminar",
                                        onClick: () => u({
                                            breakpoints: t.breakpoints.filter((x, m) => m !== g)
                                        }),
                                        children: (0, M.jsx)(X.Trash, {
                                            size: 14
                                        })
                                    })
                                })]
                            }, g))
                        })]
                    }), (0, M.jsxs)("button", {
                        className: "link-btn",
                        style: {
                            marginTop: 10
                        },
                        onClick: () => u({
                            breakpoints: [...t.breakpoints, {
                                name: "Custom",
                                min: 1600,
                                max: null
                            }]
                        }),
                        children: [(0, M.jsx)(X.Plus, {
                            size: 13,
                            style: {
                                verticalAlign: -2
                            }
                        }), " Add breakpoint"]
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Grid"
                    }), (0, M.jsxs)("table", {
                        className: "tbl",
                        children: [(0, M.jsx)("thead", {
                            children: (0, M.jsxs)("tr", {
                                children: [(0, M.jsx)("th", {
                                    style: {
                                        width: "30%"
                                    },
                                    children: "Name"
                                }), (0, M.jsx)("th", {
                                    children: "Columns"
                                }), (0, M.jsx)("th", {
                                    children: "Margin"
                                }), (0, M.jsx)("th", {
                                    children: "Gutter"
                                }), (0, M.jsx)("th", {})]
                            })
                        }), (0, M.jsx)("tbody", {
                            children: t.grid.map((d, g) => {
                                let x = m => {
                                    let E = [...t.grid];
                                    E[g] = {
                                        ...d,
                                        ...m
                                    }, u({
                                        grid: E
                                    })
                                };
                                return (0, M.jsxs)("tr", {
                                    children: [(0, M.jsx)("td", {
                                        children: (0, M.jsx)("input", {
                                            className: "input input-sm",
                                            value: d.name,
                                            onChange: m => x({
                                                name: m.target.value
                                            })
                                        })
                                    }), (0, M.jsx)("td", {
                                        children: (0, M.jsx)(Vt, {
                                            width: "100%",
                                            min: 1,
                                            max: 24,
                                            value: d.columns,
                                            onChange: m => x({
                                                columns: m
                                            })
                                        })
                                    }), (0, M.jsx)("td", {
                                        children: (0, M.jsx)(Vt, {
                                            width: "100%",
                                            value: d.margin,
                                            onChange: m => x({
                                                margin: m
                                            })
                                        })
                                    }), (0, M.jsx)("td", {
                                        children: (0, M.jsx)(Vt, {
                                            width: "100%",
                                            value: d.gutter,
                                            onChange: m => x({
                                                gutter: m
                                            })
                                        })
                                    }), (0, M.jsx)("td", {
                                        style: {
                                            width: 34
                                        },
                                        children: (0, M.jsx)("button", {
                                            className: "icon-btn",
                                            "aria-label": "Eliminar",
                                            onClick: () => u({
                                                grid: t.grid.filter((m, E) => E !== g)
                                            }),
                                            children: (0, M.jsx)(X.Trash, {
                                                size: 14
                                            })
                                        })
                                    })]
                                }, g)
                            })
                        })]
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Spacing"
                    }), (0, M.jsx)(Ot, {
                        label: "Base unit",
                        children: (0, M.jsx)(ee, {
                            value: t.spacingUnit,
                            onChange: d => u({
                                spacingUnit: Number(d)
                            }),
                            options: [{
                                value: 4,
                                label: "4px"
                            }, {
                                value: 8,
                                label: "8px"
                            }]
                        })
                    }), (0, M.jsx)("div", {
                        className: "group-label",
                        children: "Layout density"
                    }), (0, M.jsx)(Ot, {
                        label: "Scale density",
                        children: (0, M.jsx)(ee, {
                            value: t.density,
                            onChange: d => u({
                                density: d
                            }),
                            options: Object.keys(ju)
                        })
                    }), (0, M.jsxs)("div", {
                        className: "between",
                        style: {
                            marginTop: 40
                        },
                        children: [(0, M.jsx)("span", {
                            className: "tiny muted",
                            children: f ? "" : "Revisa los colores y las fuentes antes de generar."
                        }), (0, M.jsx)("button", {
                            className: "btn btn-primary",
                            disabled: !f || l,
                            onClick: n,
                            children: l ? "Generating palette\u2026" : (0, M.jsxs)(M.Fragment, {
                                children: ["Generate Design System ", (0, M.jsx)(X.ArrowRight, {
                                    size: 15
                                })]
                            })
                        })]
                    })]
                })
            })
        })
    }
    var ic = ht(Je());
    var b = ht(te()),
        D2 = ({
            hex: t
        }) => {
            let e = Ka(t);
            return (0, b.jsxs)("span", {
                className: "sw-meta",
                children: [(0, b.jsx)("span", {
                    className: "mono-num",
                    children: t
                }), (0, b.jsx)("br", {}), (0, b.jsxs)("span", {
                    className: "mono-num",
                    children: [e.ratio, ":1"]
                }), " ", (0, b.jsx)("span", {
                    className: "badge-aa" + (e.level === "AAA" ? " aaa" : e.level === "FAIL" ? " fail" : ""),
                    children: e.level
                })]
            })
        },
        e4 = ({
            ramp: t,
            onPick: e
        }) => (0, b.jsx)("div", {
            className: "ramp",
            children: fa.map(n => (0, b.jsxs)("div", {
                children: [e ? (0, b.jsx)("button", {
                    className: "swatch",
                    style: {
                        background: t[n]
                    },
                    onClick: () => e(n),
                    "aria-label": `Editar ${n}`
                }) : (0, b.jsx)("span", {
                    className: "swatch",
                    style: {
                        background: t[n]
                    }
                }), (0, b.jsxs)("span", {
                    className: "sw-meta",
                    children: ["#", n]
                }), (0, b.jsx)("div", {
                    style: {
                        marginTop: 2
                    },
                    children: (0, b.jsx)(D2, {
                        hex: t[n]
                    })
                })]
            }, n))
        }),
        $a = ({
            onCancel: t,
            onSave: e,
            note: n
        }) => (0, b.jsxs)(b.Fragment, {
            children: [(0, b.jsx)("span", {
                className: "tiny muted",
                children: n
            }), (0, b.jsxs)("span", {
                className: "row gap8",
                children: [(0, b.jsx)("button", {
                    className: "btn btn-ghost btn-sm",
                    onClick: t,
                    children: "Cancelar"
                }), (0, b.jsx)("button", {
                    className: "btn btn-secondary btn-sm",
                    onClick: e,
                    children: "Save changes"
                })]
            })]
        });

    function Q0({
        tokens: t,
        setTokens: e,
        brand: n,
        mode: l,
        setMode: a,
        onContinue: i,
        onExport: u,
        onBack: o,
        toast: r
    }) {
        let [c, f] = (0, ic.useState)(null), [s, d] = (0, ic.useState)(null), [g, x] = (0, ic.useState)({}), m = S => {
            d(JSON.parse(JSON.stringify(t))), f(S)
        }, E = () => {
            f(null), d(null)
        }, v = () => {
            e(s), f(null), d(null), r("Cambios guardados")
        }, h = c ? s : t, y = S => d({
            ...s,
            ...S
        }), p = t.modes === "Both", T = Rl(t, l), C = (0, ic.useState)("Desktop"), [k, B] = C, _ = Object.keys(h.palette), Z = S => !!h.locks?.[S];
        return (0, b.jsx)("div", {
            className: "scroller" + (l === "dark" ? " mode-dark" : ""),
            children: (0, b.jsxs)("div", {
                className: "wrap",
                style: {
                    paddingTop: 32,
                    paddingBottom: 80
                },
                children: [(0, b.jsxs)("div", {
                    className: "between",
                    style: {
                        marginBottom: 24
                    },
                    children: [(0, b.jsxs)("div", {
                        children: [(0, b.jsx)("h1", {
                            className: "page-title",
                            children: "Your Design System \u2014 Foundations"
                        }), (0, b.jsxs)("p", {
                            className: "page-sub",
                            children: ["Foundations generadas a partir del perfil de marca", n.name ? ` de ${n.name}` : "", "."]
                        })]
                    }), p && (0, b.jsx)(Gn, {
                        value: l,
                        onChange: a,
                        options: [{
                            value: "light",
                            label: "Light Mode",
                            icon: (0, b.jsx)(X.Sun, {
                                size: 13
                            })
                        }, {
                            value: "dark",
                            label: "Dark Mode",
                            icon: (0, b.jsx)(X.Moon, {
                                size: 13
                            })
                        }],
                        small: !0
                    })]
                }), (0, b.jsxs)(ca, {
                    title: "Generated Palette",
                    editing: c === "palette",
                    onEdit: () => m("palette"),
                    onClose: E,
                    footer: c === "palette" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Haz clic en cualquier muestra para editarla."
                    }) : null,
                    children: [_.map(S => (0, b.jsxs)("div", {
                        style: {
                            marginBottom: 22
                        },
                        children: [(0, b.jsxs)("div", {
                            className: "between",
                            style: {
                                marginBottom: 8
                            },
                            children: [(0, b.jsxs)("div", {
                                className: "row gap10",
                                children: [(0, b.jsx)("span", {
                                    className: "lbl-strong",
                                    children: S
                                }), c === "palette" && (0, b.jsxs)(b.Fragment, {
                                    children: [(0, b.jsx)(ra, {
                                        width: 132,
                                        value: h.palette[S][500],
                                        onChange: F => {
                                            y({
                                                palette: {
                                                    ...s.palette,
                                                    [S]: S === "neutral" ? ec(n.neutralPreset, F, h.highContrast) : Pa(F, {
                                                        aaa: h.highContrast
                                                    })
                                                }
                                            })
                                        }
                                    }), (0, b.jsx)("button", {
                                        className: "link-btn tiny",
                                        onClick: () => y({
                                            locks: {
                                                ...s.locks,
                                                [S]: !Z(S)
                                            }
                                        }),
                                        children: Z(S) ? (0, b.jsxs)(b.Fragment, {
                                            children: [(0, b.jsx)(X.Lock, {
                                                size: 12,
                                                style: {
                                                    verticalAlign: -2
                                                }
                                            }), " Bloqueado"]
                                        }) : (0, b.jsxs)(b.Fragment, {
                                            children: [(0, b.jsx)(X.Unlock, {
                                                size: 12,
                                                style: {
                                                    verticalAlign: -2
                                                }
                                            }), " Lock this color"]
                                        })
                                    })]
                                })]
                            }), c === "palette" && !Z(S) && (0, b.jsxs)("button", {
                                className: "link-btn tiny",
                                onClick: () => {
                                    let F = h.palette[S][500];
                                    y({
                                        palette: {
                                            ...s.palette,
                                            [S]: S === "neutral" ? ec(n.neutralPreset, h.palette.primary[500], h.highContrast) : Pa(F, {
                                                aaa: h.highContrast,
                                                chromaBoost: .9 + Math.random() * .35,
                                                hueShift: (Math.random() - .5) * 10
                                            })
                                        }
                                    })
                                },
                                children: [(0, b.jsx)(X.Refresh, {
                                    size: 12,
                                    style: {
                                        verticalAlign: -2
                                    }
                                }), " Regenerate scale"]
                            })]
                        }), (0, b.jsx)(e4, {
                            ramp: h.palette[S],
                            onPick: void 0
                        }), c === "palette" && (0, b.jsx)("div", {
                            className: "ramp",
                            style: {
                                marginTop: 6
                            },
                            children: fa.map(F => (0, b.jsx)(ra, {
                                value: h.palette[S][F],
                                onChange: Y => {
                                    let D = {
                                        ...s.palette,
                                        [S]: {
                                            ...s.palette[S],
                                            [F]: Y
                                        }
                                    };
                                    y({
                                        palette: D
                                    })
                                }
                            }, F))
                        })]
                    }, S)), c === "palette" && (0, b.jsxs)("button", {
                        className: "link-btn",
                        onClick: () => {
                            let S = `custom${Object.keys(s.palette).length}`;
                            y({
                                palette: {
                                    ...s.palette,
                                    [S]: Pa("#7C5CFF", {
                                        aaa: h.highContrast
                                    })
                                }
                            })
                        },
                        children: [(0, b.jsx)(X.Plus, {
                            size: 13,
                            style: {
                                verticalAlign: -2
                            }
                        }), " Add color"]
                    })]
                }), (0, b.jsx)(ca, {
                    title: "Colores sem\xE1nticos",
                    editing: c === "semantic",
                    onEdit: () => m("semantic"),
                    onClose: E,
                    footer: c === "semantic" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Los tonos 50/100/200 se usan como fondos suaves."
                    }) : null,
                    right: c === "semantic" ? (0, b.jsxs)("button", {
                        className: "link-btn tiny",
                        onClick: () => {
                            let S = zf(s.palette.primary[500], !0, h.highContrast),
                                F = {};
                            Object.entries(S).forEach(([Y, D]) => {
                                F[Y] = nc(D[500])
                            }), y({
                                semantic: S,
                                semanticScale: F
                            })
                        },
                        children: [(0, b.jsx)(X.Refresh, {
                            size: 12,
                            style: {
                                verticalAlign: -2
                            }
                        }), " Regenerar"]
                    }) : null,
                    children: (0, b.jsx)("div", {
                        style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 28
                        },
                        children: Object.entries(h.semanticScale || {}).map(([S, F]) => (0, b.jsxs)("div", {
                            children: [(0, b.jsx)("div", {
                                className: "lbl-strong",
                                style: {
                                    marginBottom: 8
                                },
                                children: S
                            }), (0, b.jsx)("div", {
                                className: "row gap6",
                                style: {
                                    alignItems: "flex-start"
                                },
                                children: qu.map(Y => (0, b.jsxs)("div", {
                                    style: {
                                        flex: 1
                                    },
                                    children: [(0, b.jsx)("span", {
                                        className: "swatch",
                                        style: {
                                            background: F[Y],
                                            height: 40
                                        }
                                    }), (0, b.jsxs)("span", {
                                        className: "sw-meta",
                                        children: ["#", Y]
                                    }), (0, b.jsx)("div", {
                                        style: {
                                            marginTop: 2
                                        },
                                        children: (0, b.jsx)(D2, {
                                            hex: F[Y]
                                        })
                                    })]
                                }, Y))
                            }), c === "semantic" && (0, b.jsx)("div", {
                                className: "row gap6",
                                style: {
                                    marginTop: 8
                                },
                                children: qu.map(Y => (0, b.jsx)(ra, {
                                    value: F[Y],
                                    onChange: D => {
                                        let J = {
                                            ...s.semanticScale,
                                            [S]: {
                                                ...F,
                                                [Y]: D
                                            }
                                        };
                                        Y === 200 ? (J[S] = nc(D), y({
                                            semanticScale: J,
                                            semantic: {
                                                ...s.semantic,
                                                [S]: Pa(D, {
                                                    aaa: h.highContrast
                                                })
                                            }
                                        })) : y({
                                            semanticScale: J
                                        })
                                    }
                                }, Y))
                            })]
                        }, S))
                    })
                }), (0, b.jsxs)(ca, {
                    title: "Typography Scale",
                    editing: c === "typography",
                    onEdit: () => m("typography"),
                    onClose: E,
                    footer: c === "typography" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Las previsualizaciones se actualizan en vivo."
                    }) : null,
                    children: [c === "typography" && (0, b.jsxs)("div", {
                        className: "field-row",
                        style: {
                            gridTemplateColumns: "1fr 1fr",
                            marginBottom: 20
                        },
                        children: [(0, b.jsx)(Ot, {
                            label: "Font family \u2014 titulares",
                            children: (0, b.jsx)("input", {
                                className: "input",
                                value: h.fonts.heading,
                                onChange: S => y({
                                    fonts: {
                                        ...s.fonts,
                                        heading: S.target.value
                                    }
                                })
                            })
                        }), (0, b.jsx)(Ot, {
                            label: "Font family \u2014 texto",
                            children: (0, b.jsx)("input", {
                                className: "input",
                                value: h.fonts.body,
                                onChange: S => y({
                                    fonts: {
                                        ...s.fonts,
                                        body: S.target.value
                                    }
                                })
                            })
                        })]
                    }), (0, b.jsxs)("table", {
                        className: "tbl",
                        children: [(0, b.jsx)("thead", {
                            children: (0, b.jsxs)("tr", {
                                children: [(0, b.jsx)("th", {
                                    style: {
                                        width: 90
                                    },
                                    children: "Name"
                                }), (0, b.jsx)("th", {
                                    children: "Preview"
                                }), c === "typography" && (0, b.jsx)("th", {
                                    style: {
                                        width: 130
                                    },
                                    children: "Family"
                                }), (0, b.jsx)("th", {
                                    style: {
                                        width: 100
                                    },
                                    children: "Size"
                                }), (0, b.jsx)("th", {
                                    style: {
                                        width: 130
                                    },
                                    children: "Weight"
                                }), (0, b.jsx)("th", {
                                    style: {
                                        width: 110
                                    },
                                    children: "Line height"
                                })]
                            })
                        }), (0, b.jsx)("tbody", {
                            children: h.typography.map((S, F) => {
                                let Y = J => {
                                        let Pt = [...s.typography];
                                        Pt[F] = {
                                            ...S,
                                            ...J
                                        }, y({
                                            typography: Pt
                                        })
                                    },
                                    D = S.family === "heading" ? h.fonts.heading : h.fonts.body;
                                return (0, b.jsxs)("tr", {
                                    style: {
                                        borderTop: F ? "1px solid var(--line)" : "none"
                                    },
                                    children: [(0, b.jsx)("td", {
                                        children: (0, b.jsx)("span", {
                                            className: "tiny muted",
                                            children: S.label
                                        })
                                    }), (0, b.jsx)("td", {
                                        style: {
                                            paddingTop: 8,
                                            paddingBottom: 8
                                        },
                                        children: (0, b.jsx)("span", {
                                            style: {
                                                fontFamily: `"${D}", Georgia, serif`,
                                                fontSize: Math.min(S.size, 44),
                                                fontWeight: S.weight,
                                                lineHeight: 1.15,
                                                color: "var(--ink-2)",
                                                display: "block",
                                                letterSpacing: S.letterSpacing
                                            },
                                            children: S.preview
                                        })
                                    }), c === "typography" && (0, b.jsx)("td", {
                                        children: (0, b.jsx)(ee, {
                                            value: S.family,
                                            onChange: J => Y({
                                                family: J
                                            }),
                                            options: [{
                                                value: "heading",
                                                label: h.fonts.heading
                                            }, {
                                                value: "body",
                                                label: h.fonts.body
                                            }],
                                            style: {
                                                height: 30,
                                                fontSize: 12
                                            }
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: c === "typography" ? (0, b.jsx)(Vt, {
                                            value: S.size,
                                            suffix: "px",
                                            width: 62,
                                            onChange: J => Y({
                                                size: J
                                            })
                                        }) : (0, b.jsxs)("span", {
                                            className: "tiny muted mono-num",
                                            children: [S.size, "px"]
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: c === "typography" ? (0, b.jsx)(ee, {
                                            value: S.weight,
                                            onChange: J => Y({
                                                weight: Number(J)
                                            }),
                                            options: [400, 500, 600, 700].map(J => ({
                                                value: J,
                                                label: String(J)
                                            })),
                                            style: {
                                                height: 30,
                                                fontSize: 12
                                            }
                                        }) : (0, b.jsxs)("span", {
                                            className: "tiny muted mono-num",
                                            children: ["W: ", S.weight]
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: c === "typography" ? (0, b.jsx)(Vt, {
                                            value: S.lineHeight,
                                            suffix: "px",
                                            width: 62,
                                            onChange: J => Y({
                                                lineHeight: J
                                            })
                                        }) : (0, b.jsxs)("span", {
                                            className: "tiny muted mono-num",
                                            children: ["LH: ", S.lineHeight, "px"]
                                        })
                                    })]
                                }, S.key)
                            })
                        })]
                    })]
                }), (0, b.jsxs)(ca, {
                    title: "Spacing Scale",
                    editing: c === "spacing",
                    onEdit: () => m("spacing"),
                    onClose: E,
                    footer: c === "spacing" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Los ejemplos aplicados se actualizan en vivo."
                    }) : null,
                    children: [c === "spacing" && (0, b.jsxs)("div", {
                        className: "field-row",
                        style: {
                            gridTemplateColumns: "1fr 1fr",
                            marginBottom: 20
                        },
                        children: [(0, b.jsx)(Ot, {
                            label: "Base unit",
                            children: (0, b.jsx)(Gn, {
                                small: !0,
                                value: h.spacing[1].value,
                                onChange: S => {
                                    let F = Number(S),
                                        Y = [.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];
                                    y({
                                        spacing: s.spacing.map((D, J) => ({
                                            ...D,
                                            value: Math.max(2, Math.round(F * Y[J] / 2) * 2)
                                        }))
                                    })
                                },
                                options: [{
                                    value: 4,
                                    label: "4px"
                                }, {
                                    value: 8,
                                    label: "8px"
                                }]
                            })
                        }), (0, b.jsx)(Ot, {
                            label: "Densidad",
                            children: (0, b.jsx)(Gn, {
                                small: !0,
                                value: "\u2014",
                                onChange: S => {
                                    let F = ju[S],
                                        Y = h.spacing[1].value,
                                        D = [.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16];
                                    y({
                                        spacing: s.spacing.map((J, Pt) => ({
                                            ...J,
                                            value: Math.max(2, Math.round(Y * D[Pt] * F / 2) * 2)
                                        }))
                                    })
                                },
                                options: Object.keys(ju)
                            })
                        })]
                    }), (0, b.jsx)("div", {
                        className: "row gap12 wrapf",
                        style: {
                            alignItems: "flex-end"
                        },
                        children: h.spacing.map((S, F) => (0, b.jsxs)("div", {
                            className: "stack gap6",
                            style: {
                                alignItems: "center"
                            },
                            children: [(0, b.jsx)("span", {
                                style: {
                                    width: Math.min(Math.max(S.value, 6), 78),
                                    height: Math.min(Math.max(S.value, 6), 96),
                                    background: "#6E9AA2",
                                    display: "block",
                                    borderRadius: 2
                                }
                            }), c === "spacing" ? (0, b.jsx)(Vt, {
                                width: 58,
                                value: S.value,
                                onChange: Y => {
                                    let D = [...s.spacing];
                                    D[F] = {
                                        ...S,
                                        value: Y
                                    }, y({
                                        spacing: D
                                    })
                                }
                            }) : (0, b.jsxs)("span", {
                                className: "tiny muted mono-num",
                                children: [S.value, "px"]
                            }), (0, b.jsx)("span", {
                                className: "tiny muted",
                                children: S.name
                            })]
                        }, S.name))
                    }), (0, b.jsxs)("div", {
                        className: "row gap24 wrapf",
                        style: {
                            marginTop: 26
                        },
                        children: [(0, b.jsxs)("div", {
                            children: [(0, b.jsx)("div", {
                                className: "lbl",
                                style: {
                                    marginBottom: 8
                                },
                                children: "Padding aplicado (card)"
                            }), (0, b.jsx)("div", {
                                style: {
                                    border: "1px solid var(--line-2)",
                                    borderRadius: Sn(h.radius.lg),
                                    padding: h.spacing[4].value,
                                    width: 220
                                },
                                children: (0, b.jsx)("div", {
                                    style: {
                                        background: "var(--paper-2)",
                                        height: 40,
                                        borderRadius: 2
                                    }
                                })
                            })]
                        }), (0, b.jsxs)("div", {
                            children: [(0, b.jsx)("div", {
                                className: "lbl",
                                style: {
                                    marginBottom: 8
                                },
                                children: "Gap entre items"
                            }), (0, b.jsx)("div", {
                                className: "stack",
                                style: {
                                    gap: h.spacing[3].value,
                                    width: 220
                                },
                                children: [0, 1, 2].map(S => (0, b.jsx)("div", {
                                    style: {
                                        background: "var(--paper-2)",
                                        height: 22,
                                        borderRadius: 2
                                    }
                                }, S))
                            })]
                        })]
                    })]
                }), (0, b.jsxs)(ca, {
                    title: "Radius Scale",
                    editing: c === "radius",
                    onEdit: () => m("radius"),
                    onClose: E,
                    footer: c === "radius" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "El mapeo por componente define qu\xE9 escal\xF3n usa cada uno."
                    }) : null,
                    children: [c === "radius" && (0, b.jsx)("div", {
                        className: "chips",
                        style: {
                            marginBottom: 20
                        },
                        children: Object.keys(Vi).map(S => (0, b.jsx)("button", {
                            className: "chip",
                            onClick: () => y({
                                radius: {
                                    ...Vi[S].scale
                                }
                            }),
                            children: S
                        }, S))
                    }), (0, b.jsx)("div", {
                        className: "row gap20 wrapf",
                        children: Object.entries(h.radius).map(([S, F]) => (0, b.jsxs)("div", {
                            className: "stack gap6",
                            style: {
                                alignItems: "center"
                            },
                            children: [(0, b.jsx)("span", {
                                style: {
                                    width: 62,
                                    height: 44,
                                    background: "var(--paper-2)",
                                    border: "1px solid var(--line-2)",
                                    borderRadius: Sn(F),
                                    display: "block"
                                }
                            }), c === "radius" ? (0, b.jsx)(Vt, {
                                width: 58,
                                value: F,
                                onChange: Y => y({
                                    radius: {
                                        ...s.radius,
                                        [S]: Y
                                    }
                                })
                            }) : (0, b.jsx)("span", {
                                className: "tiny muted mono-num",
                                children: F >= 999 ? "full" : F + "px"
                            }), (0, b.jsx)("span", {
                                className: "tiny muted",
                                children: S
                            })]
                        }, S))
                    }), (0, b.jsxs)("div", {
                        style: {
                            marginTop: 26
                        },
                        children: [(0, b.jsx)("div", {
                            className: "lbl",
                            style: {
                                marginBottom: 10
                            },
                            children: "Mapeo por componente"
                        }), (0, b.jsx)("div", {
                            style: {
                                display: "grid",
                                gridTemplateColumns: "repeat(5, 1fr)",
                                gap: 14
                            },
                            children: Object.entries(h.radiusMap).map(([S, F]) => (0, b.jsxs)("div", {
                                className: "stack gap6",
                                children: [(0, b.jsx)("span", {
                                    className: "tiny",
                                    style: {
                                        textTransform: "capitalize"
                                    },
                                    children: S
                                }), c === "radius" ? (0, b.jsx)(ee, {
                                    value: F,
                                    onChange: Y => y({
                                        radiusMap: {
                                            ...s.radiusMap,
                                            [S]: Y
                                        }
                                    }),
                                    options: Object.keys(h.radius),
                                    style: {
                                        height: 30,
                                        fontSize: 12
                                    }
                                }) : (0, b.jsx)("span", {
                                    style: {
                                        height: 26,
                                        background: "var(--paper-2)",
                                        borderRadius: Sn(h.radius[F]),
                                        display: "grid",
                                        placeItems: "center",
                                        fontSize: 10.5,
                                        color: "var(--ink-3)"
                                    },
                                    children: F
                                })]
                            }, S))
                        })]
                    })]
                }), (0, b.jsxs)(ca, {
                    title: "Shadow Presets",
                    editing: c === "shadows",
                    onEdit: () => m("shadows"),
                    onClose: E,
                    footer: c === "shadows" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Ajusta individualmente o usa el slider global."
                    }) : null,
                    children: [c === "shadows" && (0, b.jsxs)("div", {
                        style: {
                            marginBottom: 20
                        },
                        children: [(0, b.jsx)("div", {
                            className: "lbl",
                            style: {
                                marginBottom: 6
                            },
                            children: "Global intensity"
                        }), (0, b.jsxs)("div", {
                            className: "row gap12",
                            children: [(0, b.jsx)("span", {
                                className: "tiny muted",
                                children: "Subtle"
                            }), (0, b.jsx)("input", {
                                type: "range",
                                min: "0",
                                max: "200",
                                defaultValue: "100",
                                style: {
                                    flex: 1,
                                    accentColor: "var(--black)"
                                },
                                onChange: S => {
                                    let F = Number(S.target.value) / 100;
                                    y({
                                        shadows: t.shadows.map(Y => ({
                                            ...Y,
                                            y: Math.round(Y.y * F),
                                            blur: Math.round(Y.blur * F),
                                            opacity: Math.round(Y.opacity * F * 100) / 100
                                        }))
                                    })
                                }
                            }), (0, b.jsx)("span", {
                                className: "tiny muted",
                                children: "Pronounced"
                            })]
                        })]
                    }), c === "shadows" ? (0, b.jsxs)("table", {
                        className: "tbl",
                        children: [(0, b.jsx)("thead", {
                            children: (0, b.jsxs)("tr", {
                                children: [(0, b.jsx)("th", {
                                    style: {
                                        width: 44
                                    }
                                }), (0, b.jsx)("th", {
                                    style: {
                                        width: 74
                                    }
                                }), (0, b.jsx)("th", {
                                    children: "X"
                                }), (0, b.jsx)("th", {
                                    children: "Y"
                                }), (0, b.jsx)("th", {
                                    children: "Blur"
                                }), (0, b.jsx)("th", {
                                    children: "Spread"
                                }), (0, b.jsx)("th", {
                                    style: {
                                        width: 130
                                    },
                                    children: "Color"
                                }), (0, b.jsx)("th", {
                                    children: "Opacity"
                                })]
                            })
                        }), (0, b.jsx)("tbody", {
                            children: h.shadows.map((S, F) => {
                                let Y = D => {
                                    let J = [...s.shadows];
                                    J[F] = {
                                        ...S,
                                        ...D
                                    }, y({
                                        shadows: J
                                    })
                                };
                                return (0, b.jsxs)("tr", {
                                    style: {
                                        borderTop: F ? "1px solid var(--line)" : "none"
                                    },
                                    children: [(0, b.jsx)("td", {
                                        children: (0, b.jsx)("span", {
                                            className: "lbl-strong",
                                            children: S.name
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)("span", {
                                            style: {
                                                display: "block",
                                                width: 44,
                                                height: 34,
                                                background: "#fff",
                                                border: "1px solid var(--line)",
                                                borderRadius: 3,
                                                boxShadow: Al(S),
                                                margin: "8px 0"
                                            }
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)(Vt, {
                                            width: 54,
                                            value: S.x,
                                            onChange: D => Y({
                                                x: D
                                            })
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)(Vt, {
                                            width: 54,
                                            value: S.y,
                                            onChange: D => Y({
                                                y: D
                                            })
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)(Vt, {
                                            width: 54,
                                            value: S.blur,
                                            onChange: D => Y({
                                                blur: D
                                            })
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)(Vt, {
                                            width: 54,
                                            value: S.spread,
                                            onChange: D => Y({
                                                spread: D
                                            })
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)(ra, {
                                            value: S.color,
                                            onChange: D => Y({
                                                color: D
                                            })
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: (0, b.jsx)(Vt, {
                                            width: 62,
                                            step: .01,
                                            min: 0,
                                            max: 1,
                                            value: S.opacity,
                                            onChange: D => Y({
                                                opacity: D
                                            })
                                        })
                                    })]
                                }, S.name)
                            })
                        })]
                    }) : (0, b.jsx)("div", {
                        style: {
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 16
                        },
                        children: h.shadows.map(S => (0, b.jsxs)("div", {
                            style: {
                                background: "#fff",
                                border: "1px solid var(--line)",
                                borderRadius: Sn(h.radius.lg),
                                padding: "20px 16px",
                                textAlign: "center",
                                boxShadow: Al(S)
                            },
                            children: [(0, b.jsx)("div", {
                                style: {
                                    fontWeight: 600,
                                    fontSize: 12
                                },
                                children: S.name
                            }), (0, b.jsx)("div", {
                                className: "tiny muted",
                                children: "Preview box"
                            })]
                        }, S.name))
                    })]
                }), (0, b.jsxs)(ca, {
                    title: "Breakpoints",
                    editing: c === "breakpoints",
                    onEdit: () => m("breakpoints"),
                    onClose: E,
                    footer: c === "breakpoints" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Edita valores o a\xF1ade breakpoints personalizados."
                    }) : null,
                    children: [(0, b.jsxs)("table", {
                        className: "tbl",
                        children: [(0, b.jsx)("thead", {
                            children: (0, b.jsxs)("tr", {
                                children: [(0, b.jsx)("th", {
                                    style: {
                                        width: "30%"
                                    },
                                    children: "Name"
                                }), (0, b.jsx)("th", {
                                    children: "Min width"
                                }), (0, b.jsx)("th", {
                                    children: "Max width"
                                }), c === "breakpoints" && (0, b.jsx)("th", {
                                    style: {
                                        width: 34
                                    }
                                })]
                            })
                        }), (0, b.jsx)("tbody", {
                            children: h.breakpoints.map((S, F) => {
                                let Y = D => {
                                    let J = [...s.breakpoints];
                                    J[F] = {
                                        ...S,
                                        ...D
                                    }, y({
                                        breakpoints: J
                                    })
                                };
                                return (0, b.jsxs)("tr", {
                                    style: {
                                        borderTop: F ? "1px solid var(--line)" : "none"
                                    },
                                    children: [(0, b.jsx)("td", {
                                        style: {
                                            padding: "6px 8px 6px 0"
                                        },
                                        children: c === "breakpoints" ? (0, b.jsx)("input", {
                                            className: "input input-sm",
                                            value: S.name,
                                            onChange: D => Y({
                                                name: D.target.value
                                            })
                                        }) : S.name
                                    }), (0, b.jsx)("td", {
                                        children: c === "breakpoints" ? (0, b.jsx)(Vt, {
                                            width: "100%",
                                            value: S.min,
                                            onChange: D => Y({
                                                min: D
                                            })
                                        }) : (0, b.jsxs)("span", {
                                            className: "muted mono-num",
                                            children: [S.min, "px"]
                                        })
                                    }), (0, b.jsx)("td", {
                                        children: c === "breakpoints" ? (0, b.jsx)("input", {
                                            className: "input input-sm mono-num",
                                            value: S.max == null ? "\u221E" : S.max,
                                            onChange: D => Y({
                                                max: D.target.value === "\u221E" || D.target.value === "" ? null : Number(D.target.value)
                                            })
                                        }) : (0, b.jsx)("span", {
                                            className: "muted mono-num",
                                            children: S.max == null ? "\u221E" : S.max + "px"
                                        })
                                    }), c === "breakpoints" && (0, b.jsx)("td", {
                                        children: (0, b.jsx)("button", {
                                            className: "icon-btn",
                                            "aria-label": "Eliminar",
                                            onClick: () => y({
                                                breakpoints: s.breakpoints.filter((D, J) => J !== F)
                                            }),
                                            children: (0, b.jsx)(X.Trash, {
                                                size: 14
                                            })
                                        })
                                    })]
                                }, F)
                            })
                        })]
                    }), c === "breakpoints" && (0, b.jsxs)("button", {
                        className: "link-btn",
                        style: {
                            marginTop: 10
                        },
                        onClick: () => y({
                            breakpoints: [...s.breakpoints, {
                                name: "Custom",
                                min: 1600,
                                max: null
                            }]
                        }),
                        children: [(0, b.jsx)(X.Plus, {
                            size: 13,
                            style: {
                                verticalAlign: -2
                            }
                        }), " Add breakpoint"]
                    })]
                }), (0, b.jsxs)(ca, {
                    title: "Grid Overlay Preview",
                    editing: c === "grid",
                    onEdit: () => m("grid"),
                    onClose: E,
                    footer: c === "grid" ? (0, b.jsx)($a, {
                        onCancel: E,
                        onSave: v,
                        note: "Cambia de pesta\xF1a para editar cada breakpoint."
                    }) : null,
                    children: [(0, b.jsx)("div", {
                        className: "chips",
                        style: {
                            marginBottom: 16
                        },
                        children: h.grid.map(S => (0, b.jsx)("button", {
                            className: "chip" + (k === S.name ? " on" : ""),
                            onClick: () => B(S.name),
                            children: S.name
                        }, S.name))
                    }), (() => {
                        let S = h.grid.find(D => D.name === k) || h.grid[0];
                        if (!S) return (0, b.jsx)("p", {
                            className: "muted tiny",
                            children: "No hay breakpoints de grid definidos."
                        });
                        let F = h.grid.indexOf(S),
                            Y = D => {
                                let J = [...s.grid];
                                J[F] = {
                                    ...S,
                                    ...D
                                }, y({
                                    grid: J
                                })
                            };
                        return (0, b.jsxs)(b.Fragment, {
                            children: [c === "grid" && (0, b.jsxs)("div", {
                                className: "field-row",
                                style: {
                                    gridTemplateColumns: "repeat(3, 160px)",
                                    marginBottom: 18
                                },
                                children: [(0, b.jsx)(Ot, {
                                    label: "Columns",
                                    children: (0, b.jsx)(Vt, {
                                        width: "100%",
                                        min: 1,
                                        max: 24,
                                        value: S.columns,
                                        onChange: D => Y({
                                            columns: D
                                        })
                                    })
                                }), (0, b.jsx)(Ot, {
                                    label: "Margin",
                                    children: (0, b.jsx)(Vt, {
                                        width: "100%",
                                        value: S.margin,
                                        onChange: D => Y({
                                            margin: D
                                        })
                                    })
                                }), (0, b.jsx)(Ot, {
                                    label: "Gutter",
                                    children: (0, b.jsx)(Vt, {
                                        width: "100%",
                                        value: S.gutter,
                                        onChange: D => Y({
                                            gutter: D
                                        })
                                    })
                                })]
                            }), (0, b.jsx)("div", {
                                className: "grid-prev",
                                style: {
                                    gridTemplateColumns: `repeat(${S.columns}, 1fr)`,
                                    gap: S.gutter,
                                    paddingInline: Math.min(S.margin, 60)
                                },
                                children: Array.from({
                                    length: S.columns
                                }).map((D, J) => (0, b.jsx)("span", {
                                    className: "grid-col"
                                }, J))
                            }), (0, b.jsxs)("p", {
                                className: "tiny muted",
                                style: {
                                    marginTop: 10
                                },
                                children: [S.columns, " columnas \xB7 gutter ", S.gutter, "px \xB7 margin ", S.margin, "px"]
                            })]
                        })
                    })()]
                }), (0, b.jsx)("div", {
                    className: "sec",
                    style: {
                        marginBottom: 0
                    },
                    children: (0, b.jsxs)("div", {
                        className: "sec-foot",
                        style: {
                            borderTop: "none"
                        },
                        children: [(0, b.jsxs)("button", {
                            className: "btn btn-ghost",
                            onClick: o,
                            children: [(0, b.jsx)(X.ArrowLeft, {
                                size: 15
                            }), " Back"]
                        }), (0, b.jsxs)("span", {
                            className: "row gap10",
                            children: [(0, b.jsx)("button", {
                                className: "btn btn-secondary",
                                onClick: u,
                                children: "Go to export"
                            }), (0, b.jsxs)("button", {
                                className: "btn btn-primary",
                                onClick: i,
                                children: ["Continue to components ", (0, b.jsx)(X.ArrowRight, {
                                    size: 15
                                })]
                            })]
                        })]
                    })
                })]
            })
        })
    }
    var ha = ht(Je());
    var O = ht(te()),
        n4 = ({
            label: t,
            children: e
        }) => (0, O.jsxs)("div", {
            className: "prev-cell",
            children: [t && (0, O.jsx)("span", {
                className: "prev-cell-lbl",
                children: t
            }), e]
        });

    function l4({
        spec: t,
        c: e,
        cfg: n
    }) {
        let l = t.previewAxis === "none",
            a = l ? [null] : t.variants || t.intentions || t.sizes || [null],
            i = l ? null : t.variants ? "variant" : t.intentions ? "intention" : t.sizes ? "size" : null;
        return (0, O.jsx)(O.Fragment, {
            children: a.map(u => {
                let o = i ? {
                        ...n,
                        [i]: u
                    } : n,
                    r = i === "size" ? {
                        ...o,
                        props: eo(t, e, u, n.props)
                    } : o;
                return (0, O.jsx)(n4, {
                    label: u ? String(u).toUpperCase() : null,
                    children: t.render(e, r)
                }, String(u))
            })
        })
    }

    function a4({
        spec: t,
        tokens: e,
        mode: n,
        cfg: l,
        setCfg: a,
        onOpen: i,
        loading: u
    }) {
        let o = (0, ha.useMemo)(() => ja(e, n), [e, n]);
        return (0, O.jsxs)("article", {
            className: "comp-card",
            children: [(0, O.jsxs)("header", {
                className: "comp-head",
                children: [(0, O.jsxs)("div", {
                    className: "row gap12",
                    children: [(0, O.jsx)("h2", {
                        className: "sec-title",
                        children: t.name
                    }), (0, O.jsx)("span", {
                        className: "tiny muted",
                        children: lc(t)
                    })]
                }), (0, O.jsx)("button", {
                    className: "icon-btn",
                    onClick: i,
                    "aria-label": `Customize ${t.name}`,
                    children: (0, O.jsx)(X.Pencil, {
                        size: 16
                    })
                })]
            }), (0, O.jsxs)("div", {
                className: "comp-ctrls",
                children: [t.sizes && (0, O.jsxs)("div", {
                    className: "ctrl",
                    children: [(0, O.jsx)("span", {
                        className: "lbl",
                        children: "Size:"
                    }), (0, O.jsx)(ee, {
                        value: l.size,
                        onChange: r => a({
                            ...l,
                            size: r,
                            props: eo(t, o, r, l.props)
                        }),
                        options: t.sizes,
                        style: {
                            height: 28,
                            fontSize: 12,
                            width: 110
                        }
                    })]
                }), t.states && (0, O.jsxs)("div", {
                    className: "ctrl",
                    children: [(0, O.jsx)("span", {
                        className: "lbl",
                        children: "State:"
                    }), (0, O.jsx)(ee, {
                        value: l.state,
                        onChange: r => a({
                            ...l,
                            state: r
                        }),
                        options: t.states,
                        style: {
                            height: 28,
                            fontSize: 12,
                            width: 150
                        }
                    })]
                }), t.intentions && t.variants && (0, O.jsxs)("div", {
                    className: "ctrl",
                    children: [(0, O.jsx)("span", {
                        className: "lbl",
                        children: "Variant:"
                    }), (0, O.jsx)(ee, {
                        value: l.variant,
                        onChange: r => a({
                            ...l,
                            variant: r
                        }),
                        options: t.variants,
                        style: {
                            height: 28,
                            fontSize: 12,
                            width: 150
                        }
                    })]
                }), Object.entries(t.anatomy || {}).slice(0, 1).map(([r, c]) => (0, O.jsxs)("div", {
                    className: "ctrl",
                    children: [(0, O.jsxs)("span", {
                        className: "lbl",
                        children: [c.label, ":"]
                    }), c.type === "bool" ? (0, O.jsx)(Gn, {
                        small: !0,
                        value: l.anatomy[r] ? "On" : "Off",
                        onChange: f => a({
                            ...l,
                            anatomy: {
                                ...l.anatomy,
                                [r]: f === "On"
                            }
                        }),
                        options: ["On", "Off"]
                    }) : (0, O.jsx)(Gn, {
                        small: !0,
                        value: l.anatomy[r],
                        onChange: f => a({
                            ...l,
                            anatomy: {
                                ...l.anatomy,
                                [r]: f
                            }
                        }),
                        options: c.options
                    })]
                }, r))]
            }), (0, O.jsx)("div", {
                className: "preview-stage" + (n === "dark" ? " dark" : ""),
                style: {
                    background: n === "dark" ? Rl(e, "dark").canvas : void 0
                },
                children: u ? (0, O.jsxs)("div", {
                    className: "stack gap12",
                    style: {
                        width: "100%"
                    },
                    children: [(0, O.jsx)("div", {
                        className: "skel",
                        style: {
                            height: 12,
                            width: 120
                        }
                    }), (0, O.jsx)("div", {
                        className: "skel",
                        style: {
                            height: 36,
                            width: 260
                        }
                    }), (0, O.jsx)("span", {
                        className: "tiny muted",
                        children: "Generating\u2026"
                    })]
                }) : (0, O.jsx)(l4, {
                    spec: t,
                    c: o,
                    cfg: l
                })
            })]
        })
    }

    function V0({
        tokens: t,
        mode: e,
        setMode: n,
        configs: l,
        setConfigs: a,
        onExport: i,
        onBack: u,
        toast: o
    }) {
        let [r, c] = (0, ha.useState)(""), [f, s] = (0, ha.useState)(null), [d, g] = (0, ha.useState)({}), x = (0, ha.useMemo)(() => ja(t, e), [t, e]), m = t.modes === "Both";
        (0, ha.useEffect)(() => {
            let T = {
                    ...l
                },
                C = !1;
            Tn.forEach(k => {
                T[k.key] || (T[k.key] = to(k, x), C = !0)
            }), C && a(T)
        }, [x]);
        let E = Tn.filter(T => T.name.toLowerCase().includes(r.trim().toLowerCase())),
            v = f ? Y0[f] : null,
            h = v ? l[v.key] : null,
            y = (T, C) => a({
                ...l,
                [T]: C
            }),
            p = T => {
                g(C => ({
                    ...C,
                    [T]: !0
                })), setTimeout(() => {
                    let C = Y0[T],
                        k = to(C, x);
                    a(B => ({
                        ...B,
                        [T]: {
                            ...k,
                            note: B[T]?.note || ""
                        }
                    })), g(B => ({
                        ...B,
                        [T]: !1
                    })), o(`${C.name} regenerado con los tokens actuales`)
                }, 700)
            };
        return Object.keys(l).length === 0 ? (0, O.jsx)("div", {
            className: "scroller",
            children: (0, O.jsx)("div", {
                className: "wrap",
                style: {
                    paddingTop: 60
                },
                children: (0, O.jsx)("p", {
                    className: "muted",
                    children: "Generando componentes\u2026"
                })
            })
        }) : (0, O.jsxs)("div", {
            className: "scroller",
            children: [(0, O.jsxs)("div", {
                className: "wrap",
                style: {
                    paddingTop: 32,
                    paddingBottom: 80
                },
                children: [(0, O.jsxs)("div", {
                    className: "between",
                    style: {
                        marginBottom: 22,
                        alignItems: "flex-end"
                    },
                    children: [(0, O.jsxs)("div", {
                        children: [(0, O.jsx)("h1", {
                            className: "page-title",
                            children: "Generated Components"
                        }), (0, O.jsxs)("p", {
                            className: "page-sub",
                            children: [Tn.length, " componentes generados a partir de tus foundations."]
                        })]
                    }), m && (0, O.jsx)(Gn, {
                        small: !0,
                        value: e,
                        onChange: n,
                        options: [{
                            value: "light",
                            label: "Light",
                            icon: (0, O.jsx)(X.Sun, {
                                size: 13
                            })
                        }, {
                            value: "dark",
                            label: "Dark",
                            icon: (0, O.jsx)(X.Moon, {
                                size: 13
                            })
                        }]
                    })]
                }), (0, O.jsxs)("div", {
                    style: {
                        position: "relative",
                        width: 360,
                        maxWidth: "100%",
                        marginBottom: 22
                    },
                    children: [(0, O.jsx)("span", {
                        style: {
                            position: "absolute",
                            left: 12,
                            top: 11,
                            color: "var(--ink-3)"
                        },
                        children: (0, O.jsx)(X.Search, {
                            size: 15
                        })
                    }), (0, O.jsx)("input", {
                        className: "input",
                        style: {
                            paddingLeft: 34
                        },
                        placeholder: "Buscar componente\u2026",
                        value: r,
                        onChange: T => c(T.target.value)
                    })]
                }), E.length === 0 && (0, O.jsxs)("p", {
                    className: "muted",
                    children: ['Ning\xFAn componente coincide con "', r, '".']
                }), E.map(T => l[T.key] && (0, O.jsx)(a4, {
                    spec: T,
                    tokens: t,
                    mode: e,
                    cfg: l[T.key],
                    setCfg: C => y(T.key, C),
                    onOpen: () => s(T.key),
                    loading: !!d[T.key]
                }, T.key)), (0, O.jsx)("div", {
                    className: "sec",
                    style: {
                        marginBottom: 0
                    },
                    children: (0, O.jsxs)("div", {
                        className: "sec-foot",
                        style: {
                            borderTop: "none"
                        },
                        children: [(0, O.jsxs)("button", {
                            className: "btn btn-ghost",
                            onClick: u,
                            children: [(0, O.jsx)(X.ArrowLeft, {
                                size: 15
                            }), " Back to foundations"]
                        }), (0, O.jsxs)("button", {
                            className: "btn btn-primary",
                            onClick: i,
                            children: ["Go to export ", (0, O.jsx)(X.ArrowRight, {
                                size: 15
                            })]
                        })]
                    })
                })]
            }), (0, O.jsx)(y2, {
                open: !!v,
                title: v ? v.name : "",
                subtitle: v ? lc(v) : "",
                onClose: () => s(null),
                footer: v && (0, O.jsxs)(O.Fragment, {
                    children: [(0, O.jsxs)("button", {
                        className: "link-btn tiny",
                        onClick: () => p(v.key),
                        children: [(0, O.jsx)(X.Refresh, {
                            size: 12,
                            style: {
                                verticalAlign: -2
                            }
                        }), " Regenerate defaults"]
                    }), (0, O.jsxs)("span", {
                        className: "row gap8",
                        children: [(0, O.jsx)("button", {
                            className: "btn btn-ghost btn-sm",
                            onClick: () => y(v.key, to(v, x)),
                            children: "Reset"
                        }), (0, O.jsx)("button", {
                            className: "btn btn-primary btn-sm",
                            onClick: () => {
                                s(null), o(`${v.name} actualizado`)
                            },
                            children: "Done"
                        })]
                    })]
                }),
                children: v && h && (0, O.jsxs)(O.Fragment, {
                    children: [(0, O.jsx)("div", {
                        className: "preview-stage" + (e === "dark" ? " dark" : ""),
                        style: {
                            position: "sticky",
                            top: 0,
                            zIndex: 2,
                            marginTop: 16,
                            marginBottom: 20,
                            background: e === "dark" ? Rl(t, "dark").canvas : void 0
                        },
                        children: v.render(x, h)
                    }), v.states && (0, O.jsxs)(O.Fragment, {
                        children: [(0, O.jsx)("div", {
                            className: "lbl",
                            style: {
                                margin: "18px 0 8px"
                            },
                            children: "States"
                        }), (0, O.jsx)("div", {
                            className: "chips",
                            children: v.states.map(T => (0, O.jsx)("button", {
                                className: "chip" + (h.state === T ? " on" : ""),
                                onClick: () => y(v.key, {
                                    ...h,
                                    state: T
                                }),
                                children: T
                            }, T))
                        })]
                    }), v.variants && (0, O.jsxs)(O.Fragment, {
                        children: [(0, O.jsx)("div", {
                            className: "lbl",
                            style: {
                                margin: "18px 0 8px"
                            },
                            children: "Variants"
                        }), (0, O.jsx)("div", {
                            className: "chips",
                            children: v.variants.map(T => (0, O.jsx)("button", {
                                className: "chip" + (h.variant === T ? " on" : ""),
                                onClick: () => y(v.key, {
                                    ...h,
                                    variant: T
                                }),
                                children: T
                            }, T))
                        })]
                    }), v.intentions && (0, O.jsxs)(O.Fragment, {
                        children: [(0, O.jsx)("div", {
                            className: "lbl",
                            style: {
                                margin: "18px 0 8px"
                            },
                            children: "Intentions"
                        }), (0, O.jsx)("div", {
                            className: "chips",
                            children: v.intentions.map(T => (0, O.jsx)("button", {
                                className: "chip" + (h.intention === T ? " on" : ""),
                                onClick: () => y(v.key, {
                                    ...h,
                                    intention: T
                                }),
                                children: T
                            }, T))
                        })]
                    }), v.sizes && (0, O.jsxs)(O.Fragment, {
                        children: [(0, O.jsx)("div", {
                            className: "lbl",
                            style: {
                                margin: "18px 0 8px"
                            },
                            children: "Sizes"
                        }), (0, O.jsx)("div", {
                            className: "chips",
                            children: v.sizes.map(T => (0, O.jsx)("button", {
                                className: "chip" + (h.size === T ? " on" : ""),
                                onClick: () => y(v.key, {
                                    ...h,
                                    size: T,
                                    props: eo(v, x, T, h.props)
                                }),
                                children: T
                            }, T))
                        })]
                    }), v.anatomy && Object.keys(v.anatomy).length > 0 && (0, O.jsxs)(O.Fragment, {
                        children: [(0, O.jsx)("div", {
                            className: "lbl",
                            style: {
                                margin: "22px 0 10px"
                            },
                            children: "Anatomy"
                        }), (0, O.jsx)("div", {
                            className: "stack gap12",
                            children: Object.entries(v.anatomy).map(([T, C]) => C.type === "bool" ? (0, O.jsx)(Ku, {
                                checked: h.anatomy[T],
                                label: C.label,
                                onChange: k => y(v.key, {
                                    ...h,
                                    anatomy: {
                                        ...h.anatomy,
                                        [T]: k
                                    }
                                })
                            }, T) : (0, O.jsx)(Ot, {
                                label: C.label,
                                children: (0, O.jsx)(ee, {
                                    value: h.anatomy[T],
                                    options: C.options,
                                    onChange: k => y(v.key, {
                                        ...h,
                                        anatomy: {
                                            ...h.anatomy,
                                            [T]: k
                                        }
                                    })
                                })
                            }, T))
                        })]
                    }), (0, O.jsx)("div", {
                        className: "lbl",
                        style: {
                            margin: "24px 0 10px"
                        },
                        children: "Editable properties"
                    }), (0, O.jsx)("div", {
                        style: {
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12
                        },
                        children: Object.entries(h.props).map(([T, C]) => {
                            let k = v.propMeta?.[T] || T,
                                B = /radiusToken|RadiusToken/.test(T),
                                _ = /elevation|Shadow/i.test(T);
                            return (0, O.jsx)(Ot, {
                                label: k,
                                children: B ? (0, O.jsx)(ee, {
                                    value: C,
                                    options: Object.keys(t.radius),
                                    onChange: Z => y(v.key, {
                                        ...h,
                                        props: {
                                            ...h.props,
                                            [T]: Z
                                        }
                                    })
                                }) : _ ? (0, O.jsx)(ee, {
                                    value: C,
                                    options: t.shadows.map(Z => Z.name),
                                    onChange: Z => y(v.key, {
                                        ...h,
                                        props: {
                                            ...h.props,
                                            [T]: Z
                                        }
                                    })
                                }) : (0, O.jsx)(Vt, {
                                    width: "100%",
                                    step: typeof C == "number" && C < 3 ? .05 : 1,
                                    value: C,
                                    onChange: Z => y(v.key, {
                                        ...h,
                                        props: {
                                            ...h.props,
                                            [T]: Z
                                        }
                                    })
                                })
                            }, T)
                        })
                    }), (0, O.jsx)("div", {
                        className: "lbl",
                        style: {
                            margin: "24px 0 8px"
                        },
                        children: "Specific behavior"
                    }), (0, O.jsx)("textarea", {
                        className: "textarea",
                        rows: 3,
                        placeholder: "Ej.: el bot\xF3n primario debe tener una animaci\xF3n de escala en hover.",
                        value: h.note,
                        onChange: T => y(v.key, {
                            ...h,
                            note: T.target.value
                        })
                    }), (0, O.jsx)("p", {
                        className: "tiny muted",
                        style: {
                            marginTop: 6
                        },
                        children: "Se incluye en el export como nota de implementaci\xF3n para el equipo de desarrollo."
                    })]
                })
            })]
        })
    }
    var xa = ht(Je()),
        S3 = ht(p3());
    var U = ht(te()),
        Gt = t => String(t).replace(/[&<>"]/g, e => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;"
        })[e]),
        by = 120;

    function L6(t, e, n) {
        let l = ja(t, n);
        return Tn.filter(a => e?.[a.key]).map(a => {
            let i = e[a.key],
                u = [];
            a.variants && u.push({
                key: "variant",
                label: "Variant",
                values: a.variants
            }), a.intentions && u.push({
                key: "intention",
                label: "Intention",
                values: a.intentions
            }), a.sizes && u.push({
                key: "size",
                label: "Size",
                values: a.sizes
            }), a.states && u.push({
                key: "state",
                label: "State",
                values: a.states
            });
            let o = [{}];
            u.forEach(x => {
                o = o.flatMap(m => x.values.map(E => ({
                    ...m,
                    [x.key]: E
                })))
            });
            let r = o.length > by;
            r && (o = o.slice(0, by));
            let c = x => u.map(m => x[m.key]).join("||"),
                f = c(i),
                s = o.map(x => {
                    let m = {
                        ...i,
                        ...x
                    };
                    x.size && (m.props = eo(a, l, x.size, i.props));
                    let E = "";
                    try {
                        E = (0, S3.renderToStaticMarkup)(a.render(l, m))
                    } catch {
                        E = "<em>\u2014</em>"
                    }
                    let v = c(x);
                    return `<div class="sg-var" data-k="${Gt(v)}"${v===f?"":" hidden"}>${E}</div>`
                }).join(""),
                d = u.map(x => `
      <div class="sg-axis" data-axis="${Gt(x.key)}" data-value="${Gt(String(i[x.key]))}">
        <span class="sg-axis-lbl">${Gt(x.label)}</span>
        ${x.values.map(m=>`<button type="button" data-v="${Gt(String(m))}"${String(m)===String(i[x.key])?' class="on"':""}>${Gt(m)}</button>`).join("")}
      </div>`).join(""),
                g = Object.entries(a.anatomy || {}).map(([x, m]) => {
                    let E = i.anatomy[x];
                    return `<span class="sg-pill">${Gt(m.label)}: <b>${Gt(m.type==="bool"?E?"s\xED":"no":E)}</b></span>`
                }).join("");
            return `
    <section class="sg-comp" data-comp="${Gt(a.key)}" data-name="${Gt(a.name.toLowerCase())}">
      <div class="sg-comp-head">
        <h3>${Gt(a.name)}</h3><span class="sg-meta">${Gt(lc(a))}</span>
      </div>
      ${d?`<div class="sg-controls">${d}</div>`:""}
      <div class="sg-stage">${s}</div>
      ${g?`<div class="sg-anatomy">${g}</div>`:""}
      ${i.note?`<p class="sg-note"><b>Comportamiento espec\xEDfico:</b> ${Gt(i.note)}</p>`:""}
      ${r?`<p class="sg-note">Se muestran las primeras ${by} combinaciones.</p>`:""}
    </section>`
        }).join("")
    }

    function x3(t, e, n, l = "light") {
        let a = Rl(t, l),
            i = (o, r) => `
    <div class="ramp-row"><h4>${Gt(o)}</h4><div class="ramp">
      ${fa.map(c=>{let f=Ka(r[c]);return`<div class="sw"><i style="background:${r[c]}"></i><b>${c}</b><span>${r[c]}</span><span>${f.ratio}:1 ${f.level}</span></div>`}).join("")}
    </div></div>`,
            u = (o, r) => `
    <div class="ramp-row"><h4>${Gt(o)}</h4><div class="ramp ramp-3">
      ${qu.map(c=>{let f=Ka(r[c]);return`<div class="sw"><i style="background:${r[c]}"></i><b>${c}</b><span>${r[c]}</span><span>${f.ratio}:1 ${f.level}</span></div>`}).join("")}
    </div></div>`;
        return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${Gt(e.name)} \u2014 Styleguide</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${$u(t.fonts)}" rel="stylesheet">
<style>
${Af(t)}
*{box-sizing:border-box}
body{margin:0;background:${a.canvas};color:${a.text};font-family:var(--ds-font-body);font-size:15px;line-height:1.6}
.wrap{max-width:1080px;margin:0 auto;padding:56px 32px 96px}
h1,h2,h3,h4{font-family:var(--ds-font-heading);font-weight:600;margin:0}
h1{font-size:var(--ds-font-size-display-l);line-height:1.1;letter-spacing:-.02em}
h2{font-size:var(--ds-font-size-h2);margin:56px 0 18px;padding-bottom:10px;border-bottom:1px solid ${a.border}}
h4{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:${a.textMuted};margin:22px 0 8px;font-family:var(--ds-font-body)}
.sub{color:${a.textMuted};margin:10px 0 0}
.ramp{display:grid;grid-template-columns:repeat(10,1fr);gap:6px}
.sw i{display:block;height:52px;border-radius:var(--ds-radius-sm);border:1px solid rgba(0,0,0,.08)}
.sw b{display:block;font-size:11px;margin-top:6px}
.sw span{display:block;font-size:10px;color:${a.textMuted}}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:${a.textMuted};font-weight:400;padding:0 10px 8px 0}
td{padding:10px 10px 10px 0;border-top:1px solid ${a.border};vertical-align:middle}
.chips{display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end}
.chip{text-align:center;font-size:11px;color:${a.textMuted}}
.chip i{display:block;background:${a.surfaceAlt};border:1px solid ${a.border};margin-bottom:6px}
.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{background:${a.surface};border:1px solid ${a.border};border-radius:var(--ds-radius-lg);padding:22px 16px;text-align:center;font-size:12px}
ul{padding-left:18px}
code{font-size:12px;background:${a.surfaceAlt};padding:2px 5px;border-radius:3px}
.ramp-3{grid-template-columns:repeat(3,minmax(0,1fr));max-width:420px}
/* --- componentes interactivos --- */
.sg-search{width:100%;max-width:340px;padding:9px 12px;margin:0 0 22px;font:inherit;font-size:13px;
  color:${a.text};background:${a.surface};border:1px solid ${a.border};border-radius:var(--ds-radius-md)}
.sg-comp{border:1px solid ${a.border};border-radius:var(--ds-radius-lg);background:${a.surface};margin-bottom:18px;overflow:hidden}
.sg-comp-head{display:flex;align-items:baseline;gap:12px;padding:14px 20px}
.sg-comp-head h3{font-size:var(--ds-font-size-h4)}
.sg-meta{font-size:11px;color:${a.textMuted}}
.sg-controls{display:flex;flex-wrap:wrap;gap:18px;padding:12px 20px;background:${a.surfaceAlt};
  border-top:1px solid ${a.border};border-bottom:1px solid ${a.border}}
.sg-axis{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.sg-axis-lbl{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:${a.textMuted};margin-right:2px}
.sg-axis button{font:inherit;font-size:11.5px;line-height:1;padding:5px 9px;cursor:pointer;
  color:${a.text};background:${a.surface};border:1px solid ${a.border};border-radius:999px}
.sg-axis button:hover{border-color:${a.textMuted}}
.sg-axis button.on{background:${a.text};color:${a.surface};border-color:${a.text}}
.sg-stage{padding:32px 20px;display:flex;align-items:center;min-height:110px;background:${a.canvas}}
.sg-var[hidden]{display:none}
.sg-anatomy{display:flex;flex-wrap:wrap;gap:8px;padding:12px 20px;border-top:1px solid ${a.border}}
.sg-pill{font-size:11px;color:${a.textMuted};border:1px solid ${a.border};border-radius:999px;padding:2px 9px}
.sg-note{font-size:12px;color:${a.textMuted};margin:0;padding:10px 20px;border-top:1px solid ${a.border}}
</style></head><body><div class="wrap">
<h1>${Gt(e.name)}</h1>
<p class="sub">Styleguide generado el ${new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"})} \xB7 modos: ${Gt(t.modes)}${t.highContrast?" \xB7 alto contraste AAA":""}</p>

<h2>Color</h2>
${Object.entries(t.palette).map(([o,r])=>i(o,r)).join("")}
<h4>Sem\xE1nticos</h4>
${Object.entries(t.semanticScale||{}).map(([o,r])=>u(o,r)).join("")}

<h2>Tipograf\xEDa</h2>
<p class="sub">${Gt(t.fonts.heading)} para titulares \xB7 ${Gt(t.fonts.body)} para texto</p>
<table><thead><tr><th>Token</th><th>Preview</th><th>Size</th><th>Weight</th><th>Line height</th></tr></thead><tbody>
${t.typography.map(o=>`<tr><td><code>${o.key}</code></td>
<td style="font-family:var(--ds-font-${o.family==="heading"?"heading":"body"});font-size:${Math.min(o.size,46)}px;font-weight:${o.weight};line-height:1.2">${Gt(o.preview)}</td>
<td>${o.size}px</td><td>${o.weight}</td><td>${o.lineHeight}px</td></tr>`).join("")}
</tbody></table>

<h2>Espaciado</h2><div class="chips">
${t.spacing.map(o=>`<div class="chip"><i style="width:${Math.min(o.value,72)}px;height:${Math.min(o.value,72)}px"></i>${o.name} \xB7 ${o.value}px</div>`).join("")}
</div>

<h2>Radios</h2><div class="chips">
${Object.entries(t.radius).map(([o,r])=>`<div class="chip"><i style="width:64px;height:44px;border-radius:${Sn(r)}"></i>${o} \xB7 ${r>=999?"full":r+"px"}</div>`).join("")}
</div>

<h2>Sombras</h2><div class="cards">
${t.shadows.map(o=>`<div class="card" style="box-shadow:${Al(o)}"><b>${o.name}</b><br><span style="color:${a.textMuted}">${Al(o)}</span></div>`).join("")}
</div>

<h2>Breakpoints y grid</h2>
<table><thead><tr><th>Nombre</th><th>Min</th><th>Max</th><th>Columnas</th><th>Gutter</th><th>Margin</th></tr></thead><tbody>
${t.breakpoints.map(o=>{let r=t.grid.find(c=>c.name===o.name);return`<tr><td>${Gt(o.name)}</td><td>${o.min}px</td><td>${o.max==null?"\u221E":o.max+"px"}</td><td>${r?r.columns:"\u2014"}</td><td>${r?r.gutter+"px":"\u2014"}</td><td>${r?r.margin+"px":"\u2014"}</td></tr>`}).join("")}
</tbody></table>

<h2>Componentes</h2>
<p class="sub" style="margin-bottom:20px">Cambia variante, tama\xF1o y estado con los controles de cada tarjeta. Renderizados en modo ${l==="dark"?"oscuro":"claro"}.</p>
<input class="sg-search" id="sg-q" type="search" placeholder="Buscar componente\u2026" autocomplete="off">
<div id="sg-list">${L6(t,n,l)}</div>
</div>
<script>
(function () {
  document.querySelectorAll('.sg-comp').forEach(function (sec) {
    var axes = Array.prototype.slice.call(sec.querySelectorAll('.sg-axis'));
    function apply() {
      var k = axes.map(function (a) { return a.dataset.value; }).join('||');
      var found = false;
      sec.querySelectorAll('.sg-var').forEach(function (v) {
        var on = v.dataset.k === k;
        v.hidden = !on;
        if (on) found = true;
      });
      if (!found) { var f = sec.querySelector('.sg-var'); if (f) f.hidden = false; }
    }
    axes.forEach(function (axis) {
      axis.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          axis.dataset.value = b.dataset.v;
          axis.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
          apply();
        });
      });
    });
  });
  var q = document.getElementById('sg-q');
  if (q) q.addEventListener('input', function () {
    var t = q.value.trim().toLowerCase();
    document.querySelectorAll('.sg-comp').forEach(function (sec) {
      sec.style.display = sec.dataset.name.indexOf(t) === -1 ? 'none' : '';
    });
  });
})();
<\/script>
</body></html>`
    }

    function py({
        tokens: t,
        configs: e,
        meta: n,
        mode: l,
        setMode: a,
        onBack: i,
        toast: u
    }) {
        let [o, r] = (0, xa.useState)("JSON"), [c, f] = (0, xa.useState)(null), [s, d] = (0, xa.useState)(""), [g, x] = (0, xa.useState)(!1), m = (0, xa.useMemo)(() => JSON.stringify({
            ...A2(t, n),
            components: F6(t, e)
        }, null, 2), [t, e, n]), E = (0, xa.useMemo)(() => F0(t), [t]), v = (0, xa.useMemo)(() => ja(t, l), [t, l]), h = Rl(t, l), y = t.modes === "Both", p = async (C, k) => {
            let B = await p2(k);
            f(C), setTimeout(() => f(null), 1600), u(B ? "Copiado al portapapeles" : "No se pudo copiar autom\xE1ticamente")
        }, T = (n.name || "design-system").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        return (0, U.jsx)("div", {
            className: "scroller",
            children: (0, U.jsxs)("div", {
                className: "wrap",
                style: {
                    paddingTop: 32,
                    paddingBottom: 80
                },
                children: [(0, U.jsxs)("div", {
                    style: {
                        display: "grid",
                        gridTemplateColumns: "1fr 340px",
                        gap: 32,
                        alignItems: "start"
                    },
                    children: [(0, U.jsxs)("div", {
                        children: [(0, U.jsx)("h1", {
                            className: "page-title",
                            children: "Export Your Design System"
                        }), (0, U.jsx)("p", {
                            className: "page-sub",
                            children: "Descarga los tokens compilados, copia las variables o publica el styleguide."
                        })]
                    }), (0, U.jsxs)("aside", {
                        className: "panel",
                        style: {
                            padding: "22px 24px"
                        },
                        children: [(0, U.jsx)("h2", {
                            className: "sec-title",
                            style: {
                                fontSize: 20
                            },
                            children: "Share Link"
                        }), (0, U.jsx)("p", {
                            className: "tiny muted",
                            style: {
                                margin: "6px 0 14px"
                            },
                            children: "Publica el styleguide para el resto del equipo."
                        }), (0, U.jsx)("button", {
                            className: "btn btn-primary",
                            style: {
                                width: "100%"
                            },
                            disabled: g,
                            onClick: () => {
                                x(!0), setTimeout(() => {
                                    let C = x3(t, n, e, l),
                                        k = URL.createObjectURL(new Blob([C], {
                                            type: "text/html"
                                        }));
                                    d(k), x(!1), u("Styleguide generado")
                                }, 500)
                            },
                            children: g ? "Generating\u2026" : (0, U.jsxs)(U.Fragment, {
                                children: ["Generate Styleguide Link ", (0, U.jsx)(X.Link, {
                                    size: 14
                                })]
                            })
                        }), (0, U.jsxs)("div", {
                            className: "row gap8 input",
                            style: {
                                marginTop: 10,
                                padding: "0 8px 0 10px"
                            },
                            children: [(0, U.jsx)("span", {
                                className: "tiny grow",
                                style: {
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    color: s ? "var(--ink)" : "var(--ink-4)"
                                },
                                children: s ? `blob:\u2026/${T}-styleguide.html` : "https://ds-maker.sh/styleguide\u2026"
                            }), (0, U.jsx)("button", {
                                className: "icon-btn",
                                "aria-label": "Copiar enlace",
                                disabled: !s,
                                onClick: () => p("link", s),
                                children: c === "link" ? (0, U.jsx)(X.Check, {
                                    size: 14
                                }) : (0, U.jsx)(X.Copy, {
                                    size: 14
                                })
                            })]
                        }), s && (0, U.jsxs)("div", {
                            className: "row gap8",
                            style: {
                                marginTop: 10
                            },
                            children: [(0, U.jsxs)("a", {
                                className: "btn btn-secondary btn-sm grow",
                                href: s,
                                target: "_blank",
                                rel: "noreferrer",
                                style: {
                                    textDecoration: "none"
                                },
                                children: [(0, U.jsx)(X.Eye, {
                                    size: 13
                                }), " Abrir styleguide"]
                            }), (0, U.jsxs)("button", {
                                className: "btn btn-secondary btn-sm",
                                onClick: () => Sf(`${T}-styleguide.html`, x3(t, n, e, l), "text/html"),
                                children: [(0, U.jsx)(X.Download, {
                                    size: 13
                                }), " .html"]
                            })]
                        })]
                    })]
                }), (0, U.jsx)("div", {
                    className: "tabs",
                    style: {
                        margin: "30px 0 0"
                    },
                    children: ["JSON", "CSS", "Styleguide"].map(C => (0, U.jsx)("button", {
                        className: "tab" + (o === C ? " on" : ""),
                        onClick: () => r(C),
                        children: C
                    }, C))
                }), o === "JSON" && (0, U.jsxs)("section", {
                    className: "panel",
                    style: {
                        marginTop: 20
                    },
                    children: [(0, U.jsxs)("div", {
                        className: "between",
                        style: {
                            marginBottom: 12
                        },
                        children: [(0, U.jsx)("h2", {
                            className: "sec-title",
                            children: "JSON"
                        }), (0, U.jsxs)("div", {
                            className: "row gap8",
                            children: [(0, U.jsxs)("button", {
                                className: "btn btn-secondary btn-sm",
                                onClick: () => p("json", m),
                                children: [c === "json" ? (0, U.jsx)(X.Check, {
                                    size: 13
                                }) : (0, U.jsx)(X.Copy, {
                                    size: 13
                                }), " Copy"]
                            }), (0, U.jsxs)("button", {
                                className: "btn btn-primary btn-sm",
                                onClick: () => Sf(`${T}-tokens.json`, m),
                                children: ["Download ", (0, U.jsx)(X.Download, {
                                    size: 13
                                })]
                            })]
                        })]
                    }), (0, U.jsxs)("p", {
                        className: "tiny muted",
                        style: {
                            marginBottom: 14
                        },
                        children: ["Incluye metadatos (nombre, fecha de generaci\xF3n, URL de importaci\xF3n de fuentes), todos los tokens y la configuraci\xF3n de los ", Tn.length, " componentes."]
                    }), (0, U.jsx)("pre", {
                        className: "code",
                        children: m.length > 12e3 ? m.slice(0, 12e3) + `

\u2026 (` + (m.length - 12e3) + " caracteres m\xE1s en el archivo descargado)" : m
                    })]
                }), o === "CSS" && (0, U.jsxs)("section", {
                    style: {
                        marginTop: 20
                    },
                    children: [(0, U.jsxs)("div", {
                        className: "between",
                        style: {
                            marginBottom: 14
                        },
                        children: [(0, U.jsx)("p", {
                            className: "tiny muted",
                            style: {
                                margin: 0
                            },
                            children: "Copia bloque a bloque o descarga la hoja completa."
                        }), (0, U.jsxs)("div", {
                            className: "row gap8",
                            children: [(0, U.jsxs)("button", {
                                className: "btn btn-secondary btn-sm",
                                onClick: () => p("allcss", Af(t)),
                                children: [c === "allcss" ? (0, U.jsx)(X.Check, {
                                    size: 13
                                }) : (0, U.jsx)(X.Copy, {
                                    size: 13
                                }), " Copiar todo"]
                            }), (0, U.jsxs)("button", {
                                className: "btn btn-primary btn-sm",
                                onClick: () => Sf(`${T}-tokens.css`, Af(t), "text/css"),
                                children: ["Download .css ", (0, U.jsx)(X.Download, {
                                    size: 13
                                })]
                            })]
                        })]
                    }), E.map(C => (0, U.jsxs)("div", {
                        className: "sec",
                        children: [(0, U.jsxs)("div", {
                            className: "sec-head",
                            children: [(0, U.jsx)("h2", {
                                className: "sec-title",
                                style: {
                                    fontSize: 19
                                },
                                children: C.title
                            }), (0, U.jsx)("button", {
                                className: "btn btn-secondary btn-sm",
                                onClick: () => p(C.id, C.css),
                                children: c === C.id ? (0, U.jsxs)(U.Fragment, {
                                    children: [(0, U.jsx)(X.Check, {
                                        size: 13
                                    }), " Copiado"]
                                }) : (0, U.jsxs)(U.Fragment, {
                                    children: [(0, U.jsx)(X.Copy, {
                                        size: 13
                                    }), " Copy CSS"]
                                })
                            })]
                        }), (0, U.jsx)("div", {
                            className: "sec-body",
                            children: (0, U.jsx)("pre", {
                                className: "code",
                                style: {
                                    maxHeight: 190
                                },
                                children: C.css
                            })
                        })]
                    }, C.id))]
                }), o === "Styleguide" && (0, U.jsxs)("section", {
                    style: {
                        marginTop: 20
                    },
                    children: [(0, U.jsxs)("div", {
                        className: "between",
                        style: {
                            marginBottom: 14
                        },
                        children: [(0, U.jsx)("p", {
                            className: "tiny muted",
                            style: {
                                margin: 0
                            },
                            children: "Resumen completo del sistema antes de exportar."
                        }), y && (0, U.jsx)(Gn, {
                            small: !0,
                            value: l,
                            onChange: a,
                            options: [{
                                value: "light",
                                label: "Light"
                            }, {
                                value: "dark",
                                label: "Dark"
                            }]
                        })]
                    }), (0, U.jsxs)("div", {
                        className: "panel",
                        style: {
                            background: h.canvas,
                            color: h.text,
                            borderColor: h.border,
                            padding: "36px 40px"
                        },
                        children: [(0, U.jsx)("h2", {
                            style: {
                                fontFamily: `"${t.fonts.heading}", Georgia, serif`,
                                fontSize: t.typography[1].size,
                                margin: 0,
                                color: h.text,
                                fontWeight: 600
                            },
                            children: n.name
                        }), (0, U.jsxs)("p", {
                            style: {
                                color: h.textMuted,
                                fontSize: 13,
                                marginTop: 6
                            },
                            children: [Object.keys(t.palette).length, " rampas \xB7 ", t.typography.length, " niveles tipogr\xE1ficos \xB7 ", t.spacing.length, " pasos de espaciado \xB7 ", Tn.length, " componentes"]
                        }), (0, U.jsx)("h3", {
                            style: {
                                ...my(h),
                                marginTop: 34
                            },
                            children: "Color"
                        }), Object.entries(t.palette).map(([C, k]) => (0, U.jsxs)("div", {
                            style: {
                                marginBottom: 14
                            },
                            children: [(0, U.jsx)("div", {
                                style: {
                                    fontSize: 10.5,
                                    letterSpacing: ".09em",
                                    textTransform: "uppercase",
                                    color: h.textMuted,
                                    marginBottom: 5
                                },
                                children: C
                            }), (0, U.jsx)("div", {
                                style: {
                                    display: "flex",
                                    borderRadius: 3,
                                    overflow: "hidden"
                                },
                                children: fa.map(B => (0, U.jsx)("span", {
                                    style: {
                                        flex: 1,
                                        height: 34,
                                        background: k[B]
                                    }
                                }, B))
                            })]
                        }, C)), (0, U.jsx)("h3", {
                            style: my(h),
                            children: "Tipograf\xEDa"
                        }), t.typography.slice(0, 7).map(C => (0, U.jsxs)("div", {
                            style: {
                                fontFamily: `"${C.family==="heading"?t.fonts.heading:t.fonts.body}", Georgia, serif`,
                                fontSize: Math.min(C.size, 44),
                                fontWeight: C.weight,
                                lineHeight: 1.25,
                                color: h.text,
                                marginBottom: 6
                            },
                            children: [C.preview, " ", (0, U.jsxs)("span", {
                                style: {
                                    fontSize: 11,
                                    color: h.textMuted,
                                    fontFamily: "var(--mono)"
                                },
                                children: ["\xB7 ", C.size, "/", C.lineHeight]
                            })]
                        }, C.key)), (0, U.jsx)("h3", {
                            style: my(h),
                            children: "Componentes"
                        }), (0, U.jsx)("div", {
                            style: {
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                                gap: 24,
                                alignItems: "start"
                            },
                            children: Tn.filter(C => e[C.key] && C.key !== "modal").map(C => (0, U.jsxs)("div", {
                                style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 10,
                                    minWidth: 0
                                },
                                children: [(0, U.jsx)("span", {
                                    style: {
                                        fontSize: 10,
                                        letterSpacing: ".08em",
                                        textTransform: "uppercase",
                                        color: h.textMuted
                                    },
                                    children: C.name
                                }), (0, U.jsx)("div", {
                                    style: {
                                        overflow: "hidden",
                                        minWidth: 0
                                    },
                                    children: C.render(v, e[C.key])
                                })]
                            }, C.key))
                        })]
                    })]
                }), (0, U.jsx)("div", {
                    className: "sec",
                    style: {
                        marginTop: 24,
                        marginBottom: 0
                    },
                    children: (0, U.jsxs)("div", {
                        className: "sec-foot",
                        style: {
                            borderTop: "none"
                        },
                        children: [(0, U.jsxs)("button", {
                            className: "btn btn-ghost",
                            onClick: i,
                            children: [(0, U.jsx)(X.ArrowLeft, {
                                size: 15
                            }), " Back to components"]
                        }), (0, U.jsx)("span", {
                            className: "tiny muted",
                            children: "Tokens listos para producci\xF3n"
                        })]
                    })
                })]
            })
        })
    }
    var my = t => ({
        fontSize: 12,
        letterSpacing: ".1em",
        textTransform: "uppercase",
        color: t.textMuted,
        borderBottom: `1px solid ${t.border}`,
        paddingBottom: 8,
        margin: "30px 0 16px",
        fontWeight: 400
    });

    function F6(t, e) {
        let n = {};
        return Tn.forEach(l => {
            let a = e[l.key];
            a && (n[l.key] = {
                name: l.name,
                variants: l.variants || null,
                intentions: l.intentions || null,
                sizes: l.sizes || null,
                states: l.states || null,
                selected: {
                    variant: a.variant,
                    intention: a.intention,
                    size: a.size,
                    state: a.state
                },
                anatomy: a.anatomy,
                tokens: a.props,
                note: a.note || null
            })
        }), n
    }
    var I = ht(te()),
        T3 = ["Brand Onboarding", "Foundations", "Components", "Export"],
        xy = () => Math.random().toString(36).slice(2, 10),
        Y6 = t => new Date(Date.now() - t * 864e5).toISOString(),
        G6 = [{
            name: "Acme Corp Brand",
            status: "Published",
            d: 2,
            primary: "#2F5FD6",
            secondary: "#D6246B",
            heading: "IBM Plex Serif",
            body: "IBM Plex Mono",
            radius: "Subtle",
            step: 2
        }, {
            name: "Startup MVP Tokens",
            status: "Draft",
            d: 7,
            primary: "#0E9F8C",
            secondary: "#F0842C",
            heading: "Space Grotesk",
            body: "Inter",
            radius: "Playful",
            step: 1
        }, {
            name: "E-commerce Pro System",
            status: "Published",
            d: 14,
            primary: "#7C5CFF",
            secondary: "#18A957",
            heading: "Playfair Display",
            body: "DM Sans",
            radius: "Round",
            step: 2
        }, {
            name: "SaaS Dashboard Kit",
            status: "Draft",
            d: 21,
            primary: "#1F6FEB",
            secondary: "#8957E5",
            heading: "Inter",
            body: "Inter",
            radius: "Subtle",
            step: 3
        }, {
            name: "Minimal Portfolio Site",
            status: "Published",
            d: 32,
            primary: "#26241F",
            secondary: "#B4592F",
            heading: "Lora",
            body: "Work Sans",
            radius: "Sharp",
            step: 2
        }, {
            name: "Internal Admin Tools",
            status: "Draft",
            d: 61,
            primary: "#4A6572",
            secondary: "#C0453B",
            heading: "IBM Plex Sans",
            body: "IBM Plex Mono",
            radius: "Subtle",
            step: 1
        }];

    function X6() {
        return G6.map(t => {
            let e = {
                    ...wf(),
                    name: t.name,
                    colors: {
                        primary: t.primary,
                        secondary: t.secondary
                    },
                    fonts: {
                        heading: t.heading,
                        body: t.body
                    },
                    radiusStyle: t.radius
                },
                n = L0(e);
            return {
                id: xy(),
                name: t.name,
                status: t.status,
                updatedAt: Y6(t.d),
                brand: e,
                tokens: n,
                configs: {},
                lastStep: t.step
            }
        })
    }

    function Z6() {
        (0, Bt.useEffect)(() => {
            if (!document.getElementById("ds-maker-styles")) {
                let t = document.createElement("style");
                t.id = "ds-maker-styles", t.textContent = x2, document.head.appendChild(t)
            }
            if (!document.getElementById("ds-maker-fonts")) {
                let t = document.createElement("link");
                t.id = "ds-maker-fonts", t.rel = "stylesheet", t.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Serif:wght@400;500;600;700&display=swap", document.head.appendChild(t)
            }
        }, [])
    }

    function E3(t) {
        (0, Bt.useEffect)(() => {
            let e = t.filter(Boolean).sort().join("|");
            if (!e) return;
            let n = "gf-" + e.replace(/[^a-z0-9]/gi, "");
            if (document.getElementById(n)) return;
            let l = document.createElement("link");
            l.id = n, l.rel = "stylesheet", l.href = $u({
                heading: t[0],
                body: t[1]
            }), document.head.appendChild(l)
        }, [t.join("|")])
    }

    function Sy() {
        let [t, e] = (0, Bt.useState)(X6), [n, l] = (0, Bt.useState)(0), [a, i] = (0, Bt.useState)(null), [u, o] = (0, Bt.useState)(wf), [r, c] = (0, Bt.useState)(null), [f, s] = (0, Bt.useState)({}), [d, g] = (0, Bt.useState)("light"), [x, m] = (0, Bt.useState)(!1), [E, v] = (0, Bt.useState)(0), [h, y] = (0, Bt.useState)(!1), [p, T] = (0, Bt.useState)(""), [C, k] = (0, Bt.useState)(!1);
        Z6(), E3([u.fonts.heading, u.fonts.body]), E3(r ? [r.fonts.heading, r.fonts.body] : []);
        let B = (0, Bt.useCallback)(W => {
                T(W), setTimeout(() => T(""), 2200)
            }, []),
            _ = r ? 4 : 1,
            Z = () => {
                o(wf()), c(null), s({}), i(null), y(!1), l(1), g("light")
            },
            S = W => {
                o(W.brand), c(W.tokens || null), s(W.configs && Object.keys(W.configs).length ? W.configs : F(W.tokens)), i(W.id), y(!1), g("light"), l(W.status === "Draft" ? W.lastStep || 1 : 2)
            },
            F = W => {
                if (!W) return {};
                let lt = ja(W, "light"),
                    $ = {};
                return Tn.forEach(rt => {
                    $[rt.key] = to(rt, lt)
                }), $
            },
            Y = W => {
                let lt = new Date().toISOString(),
                    $ = u.name?.trim() || "Untitled System";
                if (a) e(rt => rt.map(Xt => Xt.id === a ? {
                    ...Xt,
                    name: $,
                    status: W || Xt.status,
                    updatedAt: lt,
                    brand: u,
                    tokens: r,
                    configs: f,
                    lastStep: n
                } : Xt));
                else {
                    let rt = xy();
                    e(Xt => [{
                        id: rt,
                        name: $,
                        status: W || "Draft",
                        updatedAt: lt,
                        brand: u,
                        tokens: r,
                        configs: f,
                        lastStep: n
                    }, ...Xt]), i(rt)
                }
                y(!1)
            },
            D = () => {
                Y("Draft"), B("Guardado como borrador")
            },
            J = () => {
                if (h) {
                    k(!0);
                    return
                }
                l(0)
            },
            Pt = () => {
                m(!0), v(0);
                let W = [12, 34, 58, 76, 92, 100];
                W.forEach((lt, $) => setTimeout(() => v(lt), 220 * ($ + 1))), setTimeout(() => {
                    let lt = L0(u);
                    c(lt), s(F(lt)), g(u.mode === "Dark" ? "dark" : "light"), m(!1), l(2), y(!0), B("Design system generado")
                }, 220 * W.length + 220)
            },
            Oe = W => {
                c(W), y(!0)
            },
            Te = (0, Bt.useMemo)(() => ({
                name: u.name?.trim() || "Generated System"
            }), [u.name]);
        return (0, Bt.useEffect)(() => {
            n >= 1 && y(!0)
        }, [u]), (0, Bt.useEffect)(() => {
            let W = document.querySelector(".scroller");
            W && (W.scrollTop = 0), window.scrollTo(0, 0)
        }, [n]), (0, I.jsxs)("div", {
            className: "app",
            children: [(0, I.jsx)("header", {
                className: "topbar",
                children: (0, I.jsxs)("div", {
                    className: "topbar-in",
                    children: [(0, I.jsxs)("button", {
                        className: "brand",
                        onClick: J,
                        title: "Volver al dashboard",
                        children: [u.logo && n > 0 ? (0, I.jsx)("img", {
                            src: u.logo.src,
                            alt: "",
                            style: {
                                width: 34,
                                height: 34,
                                objectFit: "contain"
                            }
                        }) : (0, I.jsx)(v2, {}), (0, I.jsxs)("span", {
                            className: "brand-name",
                            children: ["DS ", (0, I.jsx)("b", {
                                children: "Maker"
                            })]
                        })]
                    }), n > 0 && (0, I.jsxs)(I.Fragment, {
                        children: [(0, I.jsx)("nav", {
                            className: "stepper",
                            "aria-label": "Progreso",
                            children: T3.map((W, lt) => {
                                let $ = lt + 1,
                                    rt = $ === n ? "on" : $ < n ? "done" : "";
                                return (0, I.jsxs)(Bt.default.Fragment, {
                                    children: [(0, I.jsxs)("button", {
                                        className: `step-item ${rt}`,
                                        disabled: $ > _,
                                        onClick: () => l($),
                                        children: [(0, I.jsx)("span", {
                                            className: "step-badge",
                                            children: $
                                        }), (0, I.jsx)("span", {
                                            className: "step-lbl",
                                            children: W
                                        })]
                                    }), lt < T3.length - 1 && (0, I.jsx)("span", {
                                        className: "step-arrow",
                                        children: (0, I.jsx)(X.ArrowRight, {
                                            size: 15,
                                            w: 1.5
                                        })
                                    })]
                                }, W)
                            })
                        }), (0, I.jsxs)("div", {
                            className: "row gap16",
                            children: [(0, I.jsxs)("button", {
                                className: "link-btn",
                                onClick: J,
                                title: "Volver al dashboard",
                                children: [(0, I.jsx)(X.Home, {
                                    size: 13,
                                    style: {
                                        verticalAlign: -2
                                    }
                                }), " Dashboard"]
                            }), (0, I.jsx)("button", {
                                className: "link-btn",
                                onClick: D,
                                children: "Save as draft"
                            })]
                        })]
                    }), n === 0 && (0, I.jsx)("div", {
                        className: "grow row",
                        style: {
                            justifyContent: "flex-end"
                        },
                        children: (0, I.jsxs)("button", {
                            className: "btn btn-primary",
                            onClick: Z,
                            children: [(0, I.jsx)(X.Plus, {
                                size: 16
                            }), " New Design System"]
                        })
                    })]
                })
            }), n === 0 && (0, I.jsx)(G0, {
                systems: t,
                onNew: Z,
                onOpen: S,
                onRename: (W, lt) => e($ => $.map(rt => rt.id === W ? {
                    ...rt,
                    name: lt,
                    updatedAt: new Date().toISOString()
                } : rt)),
                onDuplicate: W => e(lt => [{
                    ...W,
                    id: xy(),
                    name: W.name + " copy",
                    status: "Draft",
                    updatedAt: new Date().toISOString()
                }, ...lt]),
                onDelete: W => e(lt => lt.filter($ => $.id !== W.id)),
                onExport: W => {
                    S(W), setTimeout(() => l(4), 0)
                }
            }), n === 1 && (0, I.jsx)(Z0, {
                brand: u,
                setBrand: o,
                onGenerate: Pt,
                generating: x
            }), n === 2 && r && (0, I.jsx)(Q0, {
                tokens: r,
                setTokens: Oe,
                brand: u,
                mode: d,
                setMode: g,
                onContinue: () => l(3),
                onExport: () => l(4),
                onBack: () => l(1),
                toast: B
            }), n === 3 && r && (0, I.jsx)(V0, {
                tokens: r,
                mode: d,
                setMode: g,
                configs: f,
                setConfigs: W => {
                    s(W), y(!0)
                },
                onExport: () => l(4),
                onBack: () => l(2),
                toast: B
            }), n === 4 && r && (0, I.jsx)(py, {
                tokens: r,
                configs: f,
                meta: Te,
                mode: d,
                setMode: g,
                onBack: () => l(3),
                toast: B
            }), n > 1 && !r && (0, I.jsx)("div", {
                className: "scroller",
                children: (0, I.jsxs)("div", {
                    className: "wrap",
                    style: {
                        paddingTop: 60
                    },
                    children: [(0, I.jsx)("p", {
                        className: "muted",
                        children: "A\xFAn no hay nada generado. Vuelve al paso 1 para configurar la marca."
                    }), (0, I.jsx)("button", {
                        className: "btn btn-primary",
                        style: {
                            marginTop: 16
                        },
                        onClick: () => l(1),
                        children: "Ir a Brand Onboarding"
                    })]
                })
            }), x && (0, I.jsx)("div", {
                className: "gen-overlay",
                children: (0, I.jsxs)("div", {
                    className: "gen-box",
                    children: [(0, I.jsx)("h2", {
                        className: "page-title",
                        style: {
                            fontSize: 30
                        },
                        children: "Generando tu design system\u2026"
                    }), (0, I.jsx)("div", {
                        className: "bar",
                        children: (0, I.jsx)("i", {
                            style: {
                                width: E + "%"
                            }
                        })
                    }), (0, I.jsx)("p", {
                        className: "tiny muted",
                        style: {
                            margin: 0
                        },
                        children: E < 20 ? "Generating palette\u2026" : E < 45 ? "Calculando rampas y contrastes\u2026" : E < 70 ? "Derivando la escala tipogr\xE1fica\u2026" : E < 95 ? "Construyendo spacing, radios y sombras\u2026" : "Preparando los componentes\u2026"
                    })]
                })
            }), C && (0, I.jsxs)(I.Fragment, {
                children: [(0, I.jsx)("div", {
                    className: "scrim",
                    onClick: () => k(!1)
                }), (0, I.jsxs)("div", {
                    style: {
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%,-50%)",
                        zIndex: 70,
                        background: "var(--surface)",
                        border: "1px solid var(--line-2)",
                        borderRadius: "var(--r)",
                        padding: "26px 28px",
                        width: "min(440px,92vw)",
                        boxShadow: "0 30px 70px -30px rgba(26,24,21,.6)"
                    },
                    children: [(0, I.jsx)("h2", {
                        className: "sec-title",
                        children: "Tienes cambios sin guardar"
                    }), (0, I.jsx)("p", {
                        className: "page-sub",
                        style: {
                            marginBottom: 22
                        },
                        children: "\xBFQuieres guardarlos como borrador antes de volver al dashboard?"
                    }), (0, I.jsxs)("div", {
                        className: "row gap8",
                        style: {
                            justifyContent: "flex-end"
                        },
                        children: [(0, I.jsx)("button", {
                            className: "btn btn-ghost btn-sm",
                            onClick: () => {
                                k(!1), y(!1), l(0)
                            },
                            children: "Descartar"
                        }), (0, I.jsx)("button", {
                            className: "btn btn-primary btn-sm",
                            onClick: () => {
                                Y("Draft"), k(!1), l(0), B("Guardado como borrador")
                            },
                            children: "Guardar borrador"
                        })]
                    })]
                })]
            }), (0, I.jsx)(m2, {
                msg: p
            })]
        })
    }
    var z3 = ht(te());
    (0, C3.createRoot)(document.getElementById("root")).render((0, z3.jsx)(Sy, {}));
