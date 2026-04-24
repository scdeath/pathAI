/*
  # Mineduc / MiFuturo datasets  (v3 — idempotente, sin raw duplicado)

  Fuentes (se consumen y se descartan; nada de raw jsonb duplicado):
    1) buscador_instituciones.json          → institutions (+ series temporales en jsonb)
    2) buscador_estadistica_carrera.json    → career_generic + career_stats
    3) buscar_carrera.json + oferta_academica.json (OFE_YYYY) → programs
    4) buscador_empleabilidad_ingreso.json  → career_employability
    + Mallas scrape/manual                  → subjects + program_curricula + curriculum_subjects
    + Cola de scraping                      → pending_curricula

  Reglas de diseño:
    • Scalar columns para TODO lo que se filtra/ordena/agrega (consultas rápidas, sin ->>).
    • jsonb SOLO para series temporales o estructuras variables
      (p.ej. matricula por año, tramos de ingreso por percentil, ponderaciones CINE).
    • Sin columnas `raw` ni duplicaciones: el JSON se consume en el importer y se descarta.
    • PK compuesta en programs (program_unique_code, dataset_version) → permite OFE_2026/2027…
    • Mallas normalizadas (subjects ↔ curriculum_subjects ↔ program_curricula).
    • Todo idempotente: DROP POLICY IF EXISTS antes de CREATE POLICY.
*/

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ══════════════════════════════════════════════════════════════
-- 0. CATÁLOGOS
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS regions (
  code   text PRIMARY KEY,
  nombre text NOT NULL,
  numero integer
);
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read regions" ON regions;
CREATE POLICY "public read regions" ON regions FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS comunas (
  code        text PRIMARY KEY,
  nombre      text NOT NULL,
  provincia   text,
  region_code text REFERENCES regions(code) ON DELETE SET NULL
);
ALTER TABLE comunas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read comunas" ON comunas;
CREATE POLICY "public read comunas" ON comunas FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_comunas_region ON comunas (region_code);

-- ══════════════════════════════════════════════════════════════
-- 1. INSTITUTIONS
--    Escalares para filtro/orden. jsonb sólo para series anuales.
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS institutions (
  institution_code        integer PRIMARY KEY,
  dataset_version         text    NOT NULL DEFAULT 'SIES_2025_2026',
  tipo_institucion        text,
  nombre_institucion      text    NOT NULL,
  autonomia               text,
  direccion_sede_central  text,
  pagina_web              text,
  tipo_de_sociedad        text,
  rut                     text,
  estado_financiero       text,
  principio_contable      text,

  -- Acreditación
  acreditacion_estado          text,
  acreditacion_anos            integer,
  acreditacion_vigencia_desde  date,
  acreditacion_vigencia_hasta  date,
  acreditacion_areas           text[] DEFAULT '{}',
  acreditacion_areas_electivas text[] DEFAULT '{}',

  -- Totales "actuales" (último año del dataset)
  matricula_pregrado_actual  integer,
  matricula_posgrado_actual  integer,
  titulados_pregrado_actual  integer,
  retencion_1er_ano_pct      numeric(5,2),
  duracion_formal_semestres  numeric(5,2),
  duracion_real_semestres    numeric(5,2),
  total_jce                  numeric(10,2),
  promedio_nem               numeric(5,3),
  promedio_paes              numeric(6,2),

  -- Financiero 2024 (plano — se consulta)
  ingresos_operacion_clp     bigint,
  resultado_ejercicio_clp    bigint,
  total_activos_clp          bigint,
  patrimonio_total_clp       bigint,

  -- Infraestructura (plano)
  m2_construidos             numeric(10,2),
  volumenes_biblioteca       integer,
  laboratorios_talleres      integer,
  computadores               integer,

  -- Series temporales / estructuras variables
  matricula_pregrado_por_ano  jsonb DEFAULT '{}'::jsonb,   -- {"2020":959,"2025":4297}
  matricula_posgrado_por_ano  jsonb DEFAULT '{}'::jsonb,
  titulados_pregrado_por_ano  jsonb DEFAULT '{}'::jsonb,
  titulados_posgrado_por_ano  jsonb DEFAULT '{}'::jsonb,
  matricula_pct_por_area      jsonb DEFAULT '{}'::jsonb,
  matricula_pct_por_origen    jsonb DEFAULT '{}'::jsonb,
  jce_por_nivel_academico     jsonb DEFAULT '{}'::jsonb,

  updated_at  timestamptz DEFAULT now()
);

-- Compatibilidad: si la tabla ya existia de una migracion previa,
-- agregar columnas faltantes antes de crear indices/policies.
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS dataset_version text NOT NULL DEFAULT 'SIES_2025_2026';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS tipo_institucion text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS nombre_institucion text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS autonomia text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS direccion_sede_central text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS pagina_web text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS tipo_de_sociedad text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS rut text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS estado_financiero text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS principio_contable text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS acreditacion_estado text;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS acreditacion_anos integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS acreditacion_vigencia_desde date;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS acreditacion_vigencia_hasta date;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS acreditacion_areas text[] DEFAULT '{}';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS acreditacion_areas_electivas text[] DEFAULT '{}';
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS matricula_pregrado_actual integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS matricula_posgrado_actual integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS titulados_pregrado_actual integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS retencion_1er_ano_pct numeric(5,2);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS duracion_formal_semestres numeric(5,2);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS duracion_real_semestres numeric(5,2);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS total_jce numeric(10,2);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS promedio_nem numeric(5,3);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS promedio_paes numeric(6,2);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS ingresos_operacion_clp bigint;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS resultado_ejercicio_clp bigint;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS total_activos_clp bigint;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS patrimonio_total_clp bigint;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS m2_construidos numeric(10,2);
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS volumenes_biblioteca integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS laboratorios_talleres integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS computadores integer;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS matricula_pregrado_por_ano jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS matricula_posgrado_por_ano jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS titulados_pregrado_por_ano jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS titulados_posgrado_por_ano jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS matricula_pct_por_area jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS matricula_pct_por_origen jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS jce_por_nivel_academico jsonb DEFAULT '{}'::jsonb;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read institutions" ON institutions;
CREATE POLICY "public read institutions" ON institutions FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_institutions_nombre_trgm ON institutions USING GIN (nombre_institucion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_institutions_tipo       ON institutions (tipo_institucion);
CREATE INDEX IF NOT EXISTS idx_institutions_acred      ON institutions (acreditacion_estado, acreditacion_anos);

-- ══════════════════════════════════════════════════════════════
-- 2. CAREER_GENERIC (maestro)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS career_generic (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                    text UNIQUE NOT NULL,
  area                    text NOT NULL,
  tipo_institucion        text NOT NULL,
  nombre_carrera_generica text NOT NULL,
  nivel_global            text,
  UNIQUE (area, tipo_institucion, nombre_carrera_generica)
);
ALTER TABLE career_generic ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read career_generic" ON career_generic;
CREATE POLICY "public read career_generic" ON career_generic FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_career_generic_area        ON career_generic (area);
CREATE INDEX IF NOT EXISTS idx_career_generic_nombre_trgm ON career_generic USING GIN (nombre_carrera_generica gin_trgm_ops);

-- ══════════════════════════════════════════════════════════════
-- 3. PROGRAMS  (buscar_carrera.json + oferta_academica.json)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS programs (
  program_unique_code       text NOT NULL,
  dataset_version           text NOT NULL DEFAULT 'OFE_2026',
  is_current                boolean NOT NULL DEFAULT true,

  institution_code          integer REFERENCES institutions(institution_code) ON DELETE CASCADE,
  career_generic_id         uuid    REFERENCES career_generic(id) ON DELETE SET NULL,

  -- Clasificación
  area_conocimiento         text,
  area_carrera_generica     text,
  cine_f97_area             text,
  cine_f97_subarea          text,
  cine_f13_area             text,
  cine_f13_subarea          text,
  tipo_institucion          text,
  tipo_institucion_detalle  text,              -- ej: "Universidades Privadas"

  -- Identificación
  codigo_ies                text,
  codigo_sede               text,
  codigo_carrera            text,
  nombre_carrera            text NOT NULL,
  nombre_institucion        text,
  nombre_sede               text,
  nombre_titulo             text,
  grado_academico           text,

  -- Geo
  region                    text,
  region_code               text REFERENCES regions(code) ON DELETE SET NULL,
  provincia                 text,
  comuna                    text,
  comuna_code               text REFERENCES comunas(code) ON DELETE SET NULL,

  -- Modalidad / nivel
  jornada                   text,
  modalidad                 text,
  nivel_carrera             text,
  nivel_global              text,
  tipo_carrera              text,
  plan_especial             text,
  regimen                   text,
  duracion_formal_regimen   integer,

  -- Duración
  duracion_formal_semestres integer,
  duracion_titulacion       integer,
  duracion_total            integer,
  semestres_reconocidos     integer,

  -- Acreditación / requisitos
  acreditacion_programa     text,
  requisito_ingreso         text,
  elegibilidad_beca_pedagogia text,
  pedagogia_medicina_odontologia_otro text,
  ano_inicio                integer,
  demre                     boolean,

  -- Vacantes & costos
  vacantes_semestre_1       integer,
  vacantes_semestre_2       integer,
  arancel_anual             integer,
  matricula_anual           integer,
  costo_titulacion          integer,
  costo_certificado_diploma integer,

  -- Matrícula / titulación con splits género
  matricula_total_2025                integer,
  matricula_total_fem_2025            integer,
  matricula_total_mas_2025            integer,
  matricula_primer_ano_2025           integer,
  matricula_primer_ano_fem_2025       integer,
  matricula_primer_ano_mas_2025       integer,
  titulacion_total_2024               integer,
  titulacion_fem_2024                 integer,
  titulacion_mas_2024                 integer,

  -- Selección / puntajes
  promedio_nem                     numeric(5,3),
  puntaje_corte_ultimo             numeric(7,2),   -- último matriculado (ponderado)
  puntaje_corte_primero            numeric(7,2),   -- primer matriculado
  puntaje_promedio_matriculados    numeric(7,2),
  anio_puntajes                    integer,

  -- Ponderaciones PAES (planos)
  pond_nem             numeric(5,2),
  pond_ranking         numeric(5,2),
  pond_lenguaje        numeric(5,2),
  pond_matematicas     numeric(5,2),
  pond_matematicas_2   numeric(5,2),
  pond_historia        numeric(5,2),
  pond_ciencias        numeric(5,2),
  pond_otros           numeric(5,2),

  -- Variables
  areas_destino_cine   jsonb DEFAULT '{}'::jsonb,       -- 10 flags CINE destino
  origen_matricula_pct jsonb DEFAULT '{}'::jsonb,       -- % por establecimiento origen
  vigencia             text,

  updated_at           timestamptz DEFAULT now(),

  PRIMARY KEY (program_unique_code, dataset_version)
);

-- Compatibilidad con versiones anteriores de programs.
ALTER TABLE programs ADD COLUMN IF NOT EXISTS dataset_version text NOT NULL DEFAULT 'OFE_2026';
ALTER TABLE programs ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS institution_code integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS career_generic_id uuid;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS area_conocimiento text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS area_carrera_generica text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cine_f97_area text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cine_f97_subarea text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cine_f13_area text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS cine_f13_subarea text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS tipo_institucion text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS tipo_institucion_detalle text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS codigo_ies text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS codigo_sede text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS codigo_carrera text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS nombre_carrera text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS nombre_institucion text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS nombre_sede text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS nombre_titulo text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS grado_academico text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS region_code text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS provincia text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS comuna text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS comuna_code text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS jornada text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS modalidad text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS nivel_carrera text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS nivel_global text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS tipo_carrera text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS plan_especial text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS regimen text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS duracion_formal_regimen integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS duracion_formal_semestres integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS duracion_titulacion integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS duracion_total integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS semestres_reconocidos integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS acreditacion_programa text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS requisito_ingreso text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS elegibilidad_beca_pedagogia text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pedagogia_medicina_odontologia_otro text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS ano_inicio integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS demre boolean;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS vacantes_semestre_1 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS vacantes_semestre_2 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS arancel_anual integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_anual integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS costo_titulacion integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS costo_certificado_diploma integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_total_2025 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_total_fem_2025 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_total_mas_2025 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_primer_ano_2025 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_primer_ano_fem_2025 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS matricula_primer_ano_mas_2025 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS titulacion_total_2024 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS titulacion_fem_2024 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS titulacion_mas_2024 integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS promedio_nem numeric(5,3);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS puntaje_corte_ultimo numeric(7,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS puntaje_corte_primero numeric(7,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS puntaje_promedio_matriculados numeric(7,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS anio_puntajes integer;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_nem numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_ranking numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_lenguaje numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_matematicas numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_matematicas_2 numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_historia numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_ciencias numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS pond_otros numeric(5,2);
ALTER TABLE programs ADD COLUMN IF NOT EXISTS areas_destino_cine jsonb DEFAULT '{}'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS origen_matricula_pct jsonb DEFAULT '{}'::jsonb;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS vigencia text;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read programs" ON programs;
CREATE POLICY "public read programs" ON programs FOR SELECT TO anon, authenticated USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS idx_programs_current_unique
  ON programs (program_unique_code) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_programs_institution ON programs (institution_code) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_programs_generic     ON programs (career_generic_id) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_programs_area        ON programs (area_carrera_generica, tipo_institucion) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_programs_region      ON programs (region_code) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_programs_nombre_trgm ON programs USING GIN (nombre_carrera gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_programs_arancel     ON programs (arancel_anual) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_programs_puntaje     ON programs (puntaje_corte_ultimo) WHERE is_current = true;

CREATE OR REPLACE VIEW programs_current AS
  SELECT * FROM programs WHERE is_current = true;

-- ══════════════════════════════════════════════════════════════
-- 4. CAREER_STATS  (buscador_estadistica_carrera.json)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS career_stats (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version           text NOT NULL DEFAULT 'SIES_2025_2026',
  career_generic_id         uuid REFERENCES career_generic(id) ON DELETE CASCADE,
  area                      text NOT NULL,
  tipo_institucion          text NOT NULL,
  nombre_carrera_generica   text NOT NULL,

  -- Ingresos (planos por año post-titulación)
  ingreso_1er_ano_clp       integer,
  ingreso_2do_ano_clp       integer,
  ingreso_3er_ano_clp       integer,
  ingreso_4to_ano_clp       integer,
  ingreso_5to_ano_clp       integer,

  -- Empleabilidad planas
  empleabilidad_1er_ano_pct numeric(5,2),
  empleabilidad_2do_ano_pct numeric(5,2),

  -- Retención / duración
  retencion_1er_ano_pct     numeric(5,2),
  duracion_formal_semestres numeric(5,2),
  duracion_real_semestres   numeric(5,2),

  -- Titulados 2024 / Matrícula 2025 (con género)
  titulados_2024_total      integer,
  titulados_2024_fem        integer,
  titulados_2024_mas        integer,
  matricula_primer_ano_2025_total integer,
  matricula_primer_ano_2025_fem   integer,
  matricula_primer_ano_2025_mas   integer,
  matricula_total_2025_total integer,
  matricula_total_2025_fem   integer,
  matricula_total_2025_mas   integer,

  -- Series/variables: mantener en jsonb
  tramos_ingreso            jsonb DEFAULT '{}'::jsonb,   -- percentiles por año
  evolucion_ingreso_4       jsonb DEFAULT '{}'::jsonb,   -- {"2020":…,"2024":…}
  evolucion_empleabilidad_1 jsonb DEFAULT '{}'::jsonb,
  evolucion_empleabilidad_2 jsonb DEFAULT '{}'::jsonb,
  distribucion_origen_pct   jsonb DEFAULT '{}'::jsonb,

  UNIQUE (dataset_version, area, tipo_institucion, nombre_carrera_generica)
);

-- Compatibilidad con versiones anteriores de career_stats.
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS dataset_version text NOT NULL DEFAULT 'SIES_2025_2026';
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS career_generic_id uuid;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS tipo_institucion text;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS nombre_carrera_generica text;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS ingreso_1er_ano_clp integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS ingreso_2do_ano_clp integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS ingreso_3er_ano_clp integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS ingreso_4to_ano_clp integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS ingreso_5to_ano_clp integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS empleabilidad_1er_ano_pct numeric(5,2);
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS empleabilidad_2do_ano_pct numeric(5,2);
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS retencion_1er_ano_pct numeric(5,2);
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS duracion_formal_semestres numeric(5,2);
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS duracion_real_semestres numeric(5,2);
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS titulados_2024_total integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS titulados_2024_fem integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS titulados_2024_mas integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS matricula_primer_ano_2025_total integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS matricula_primer_ano_2025_fem integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS matricula_primer_ano_2025_mas integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS matricula_total_2025_total integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS matricula_total_2025_fem integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS matricula_total_2025_mas integer;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS tramos_ingreso jsonb DEFAULT '{}'::jsonb;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS evolucion_ingreso_4 jsonb DEFAULT '{}'::jsonb;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS evolucion_empleabilidad_1 jsonb DEFAULT '{}'::jsonb;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS evolucion_empleabilidad_2 jsonb DEFAULT '{}'::jsonb;
ALTER TABLE career_stats ADD COLUMN IF NOT EXISTS distribucion_origen_pct jsonb DEFAULT '{}'::jsonb;

ALTER TABLE career_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read career_stats" ON career_stats;
CREATE POLICY "public read career_stats" ON career_stats FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_career_stats_generic ON career_stats (career_generic_id);
CREATE INDEX IF NOT EXISTS idx_career_stats_lookup  ON career_stats (area, tipo_institucion, nombre_carrera_generica);
CREATE INDEX IF NOT EXISTS idx_career_stats_ingreso ON career_stats (ingreso_4to_ano_clp DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_career_stats_empleab ON career_stats (empleabilidad_1er_ano_pct DESC NULLS LAST);

-- ══════════════════════════════════════════════════════════════
-- 5. CAREER_EMPLOYABILITY  (buscador_empleabilidad_ingreso.json)
--    Granularidad: carrera-título por institución.
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS career_employability (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_version                 text NOT NULL DEFAULT 'SIES_2025_2026',
  codigo                          integer,
  institution_code                integer REFERENCES institutions(institution_code) ON DELETE SET NULL,
  tipo_institucion                text,
  nombre_institucion              text,
  acreditacion_institucion        text,
  area                            text,
  nombre_carrera_generica         text,
  nombre_carrera_titulo           text,

  -- Todo parseado a numérico (los strings fuente se descartan)
  titulados_continuidad_pct       numeric(5,2),
  retencion_1_ano_pct             numeric(5,2),
  duracion_real_semestres         numeric(5,2),
  empleabilidad_1_ano_pct         numeric(5,2),
  empleabilidad_2_ano_pct         numeric(5,2),
  -- Ingreso viene como rango: guardamos min/max + etiqueta legible
  ingreso_label                   text,
  ingreso_min_clp                 integer,
  ingreso_max_clp                 integer,

  UNIQUE (dataset_version, codigo, nombre_carrera_titulo, nombre_institucion)
);

-- Compatibilidad con versiones anteriores de career_employability.
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS dataset_version text NOT NULL DEFAULT 'SIES_2025_2026';
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS codigo integer;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS institution_code integer;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS tipo_institucion text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS nombre_institucion text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS acreditacion_institucion text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS area text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS nombre_carrera_generica text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS nombre_carrera_titulo text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS titulados_continuidad_pct numeric(5,2);
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS retencion_1_ano_pct numeric(5,2);
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS duracion_real_semestres numeric(5,2);
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS empleabilidad_1_ano_pct numeric(5,2);
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS empleabilidad_2_ano_pct numeric(5,2);
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS ingreso_label text;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS ingreso_min_clp integer;
ALTER TABLE career_employability ADD COLUMN IF NOT EXISTS ingreso_max_clp integer;

ALTER TABLE career_employability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read career_employability" ON career_employability;
CREATE POLICY "public read career_employability" ON career_employability FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_emp_inst        ON career_employability (institution_code);
CREATE INDEX IF NOT EXISTS idx_emp_generic     ON career_employability (area, nombre_carrera_generica);
CREATE INDEX IF NOT EXISTS idx_emp_titulo_trgm ON career_employability USING GIN (nombre_carrera_titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_emp_ingreso     ON career_employability (ingreso_min_clp DESC NULLS LAST);

-- ══════════════════════════════════════════════════════════════
-- 6. MALLAS CURRICULARES (normalizadas)
-- ══════════════════════════════════════════════════════════════

-- 6.a Catálogo de ramos
CREATE TABLE IF NOT EXISTS subjects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text UNIQUE NOT NULL,
  nombre_canonico  text NOT NULL,
  categoria        text,                         -- matematicas, programacion, salud, …
  skills           text[] DEFAULT '{}',
  aliases          text[] DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read subjects" ON subjects;
CREATE POLICY "public read subjects" ON subjects FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_subjects_cat         ON subjects (categoria);
CREATE INDEX IF NOT EXISTS idx_subjects_nombre_trgm ON subjects USING GIN (nombre_canonico gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_subjects_skills      ON subjects USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_subjects_aliases     ON subjects USING GIN (aliases);

-- 6.b Malla por programa (1 a 1)
CREATE TABLE IF NOT EXISTS program_curricula (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_unique_code  text NOT NULL,
  dataset_version      text NOT NULL DEFAULT 'OFE_2026',
  source               text,                       -- scrape | manual | import
  source_url           text,
  scraped_at           timestamptz,
  status               text DEFAULT 'ok' CHECK (status IN ('ok','partial','pending')),
  total_semestres      integer,
  total_creditos       integer,
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (program_unique_code, dataset_version),
  FOREIGN KEY (program_unique_code, dataset_version)
    REFERENCES programs (program_unique_code, dataset_version) ON DELETE CASCADE
);

-- Compatibilidad con versiones anteriores de program_curricula.
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS program_unique_code text;
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS dataset_version text NOT NULL DEFAULT 'OFE_2026';
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS scraped_at timestamptz;
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS status text DEFAULT 'ok';
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS total_semestres integer;
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS total_creditos integer;
ALTER TABLE program_curricula ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE program_curricula ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read program_curricula" ON program_curricula;
CREATE POLICY "public read program_curricula" ON program_curricula FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_pc_status ON program_curricula (status);

-- 6.c Pivote ramo ↔ malla (por semestre)
CREATE TABLE IF NOT EXISTS curriculum_subjects (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id        uuid NOT NULL REFERENCES program_curricula(id) ON DELETE CASCADE,
  subject_id           uuid REFERENCES subjects(id) ON DELETE SET NULL,
  nombre_original      text NOT NULL,
  semester             integer,
  creditos             numeric(5,2),
  tipo                 text,                         -- obligatorio | electivo | formacion_general
  prerrequisitos       text[] DEFAULT '{}',
  orden                integer
);
ALTER TABLE curriculum_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read curriculum_subjects" ON curriculum_subjects;
CREATE POLICY "public read curriculum_subjects" ON curriculum_subjects FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_cs_curriculum  ON curriculum_subjects (curriculum_id);
CREATE INDEX IF NOT EXISTS idx_cs_subject     ON curriculum_subjects (subject_id);
CREATE INDEX IF NOT EXISTS idx_cs_semester    ON curriculum_subjects (curriculum_id, semester);
CREATE INDEX IF NOT EXISTS idx_cs_nombre_trgm ON curriculum_subjects USING GIN (nombre_original gin_trgm_ops);

-- ══════════════════════════════════════════════════════════════
-- 7. PENDING_CURRICULA (cola de scraper)
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pending_curricula (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_unique_code  text NOT NULL,
  dataset_version      text NOT NULL DEFAULT 'OFE_2026',
  requested_by         uuid,
  priority             integer DEFAULT 0,
  attempts             integer DEFAULT 0,
  last_error           text,
  status               text DEFAULT 'queued' CHECK (status IN ('queued','processing','done','failed')),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  UNIQUE (program_unique_code, dataset_version),
  FOREIGN KEY (program_unique_code, dataset_version)
    REFERENCES programs (program_unique_code, dataset_version) ON DELETE CASCADE
);

-- Compatibilidad con versiones anteriores de pending_curricula.
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS program_unique_code text;
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS dataset_version text NOT NULL DEFAULT 'OFE_2026';
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS requested_by uuid;
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS attempts integer DEFAULT 0;
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS status text DEFAULT 'queued';
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE pending_curricula ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE pending_curricula ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read pending_curricula" ON pending_curricula;
CREATE POLICY "public read pending_curricula" ON pending_curricula FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_pending_status ON pending_curricula (status, priority DESC, attempts);

-- ══════════════════════════════════════════════════════════════
-- 8. VISTA UNIFICADA  (para cards / chat / comparador)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW v_program_full AS
SELECT
  p.program_unique_code,
  p.dataset_version,
  p.nombre_carrera,
  p.nombre_institucion,
  p.tipo_institucion,
  p.region,
  p.comuna,
  p.jornada,
  p.modalidad,
  p.duracion_formal_semestres,
  p.arancel_anual,
  COALESCE(p.vacantes_semestre_1,0) + COALESCE(p.vacantes_semestre_2,0) AS vacantes_totales,
  p.puntaje_corte_ultimo,
  p.puntaje_promedio_matriculados,
  p.promedio_nem,
  p.matricula_primer_ano_2025,
  p.acreditacion_programa,
  i.acreditacion_estado        AS institucion_acreditacion,
  i.acreditacion_anos          AS institucion_acreditacion_anos,
  cg.id                        AS career_generic_id,
  cg.nombre_carrera_generica,
  cs.ingreso_4to_ano_clp,
  cs.empleabilidad_1er_ano_pct,
  cs.empleabilidad_2do_ano_pct,
  cs.retencion_1er_ano_pct,
  cs.duracion_real_semestres   AS duracion_real_generica_semestres,
  EXISTS (
    SELECT 1 FROM program_curricula pc
     WHERE pc.program_unique_code = p.program_unique_code
       AND pc.dataset_version = p.dataset_version
       AND pc.status = 'ok'
  ) AS tiene_malla
FROM programs p
LEFT JOIN institutions i    ON i.institution_code = p.institution_code
LEFT JOIN career_generic cg ON cg.id = p.career_generic_id
LEFT JOIN career_stats cs   ON cs.career_generic_id = cg.id
                            AND cs.dataset_version = 'SIES_2025_2026'
WHERE p.is_current = true;
