// ─────────────────────────────────────────────────────────────────────────────
// Regra de negócio GLOBAL de leitura de pedidos.
// O app só considera pedidos cujo `id_nota_conf` esteja nesta lista. O filtro é
// aplicado NA ORIGEM (nas queries dos services), nunca só no front-end — pedidos
// fora desta lista não são buscados, contados, exibidos nem processados.
//
// Aplicado em toda leitura de `concrem_pedidos_venda`:
//   .in('id_nota_conf', VALID_ID_NOTA_CONF)
// PostgREST usa `IN (...)`, então valores nulos são naturalmente ignorados.
// ─────────────────────────────────────────────────────────────────────────────
export const VALID_ID_NOTA_CONF: number[] = [307, 309, 613, 665];
