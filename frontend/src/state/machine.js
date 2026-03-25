export const machine = {
  idle:    { on: { START: "burst" }},
  burst:   { on: { DRIFT: "drift" }},
  drift:   { on: { CONVERGE: "converge" }},
  converge:{ on: { COMPLETE: "complete" }},
  complete:{ on: { RESET: "idle" }}
}