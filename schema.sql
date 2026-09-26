--
-- PostgreSQL database dump
--

\restrict cSvVBOYND8489e5J05gF9s8fmi8DjoEBxekQZCZC1uaczdWg8sg7Z5bYC1z2IVN

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-09-25 18:39:48

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 896 (class 1247 OID 25104)
-- Name: agegroup; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.agegroup AS ENUM (
    'GENERIC',
    'TODDLER',
    'CHILDREN',
    'TEENAGER',
    'ADULT'
);


ALTER TYPE public.agegroup OWNER TO postgres;

--
-- TOC entry 905 (class 1247 OID 25142)
-- Name: book_condition; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.book_condition AS ENUM (
    'NEW',
    'GOOD',
    'FAIR',
    'WORN'
);


ALTER TYPE public.book_condition OWNER TO postgres;

--
-- TOC entry 872 (class 1247 OID 17254)
-- Name: book_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.book_status AS ENUM (
    'AVAILABLE',
    'REQUESTED',
    'REQUEST_ACCEPTED',
    'VOLUNTEER_PICKED',
    'VOLUNTEER_DELIVERED',
    'ISSUED',
    'RETURN_REQUESTED',
    'RETURN_PICKED',
    'RETURN_DELIVERED'
);


ALTER TYPE public.book_status OWNER TO postgres;

--
-- TOC entry 914 (class 1247 OID 25204)
-- Name: bookcondition; Type: TYPE; Schema: public; Owner: baboook_deval
--

CREATE TYPE public.bookcondition AS ENUM (
    'NEW',
    'GOOD',
    'FAIR',
    'WORN'
);


ALTER TYPE public.bookcondition OWNER TO baboook_deval;

--
-- TOC entry 890 (class 1247 OID 17412)
-- Name: bookstatus; Type: TYPE; Schema: public; Owner: baboook_deval
--

CREATE TYPE public.bookstatus AS ENUM (
    'AVAILABLE',
    'REQUESTED',
    'REQUEST_ACCEPTED',
    'VOLUNTEER_PICKED',
    'VOLUNTEER_DELIVERED',
    'ISSUED',
    'RETURN_REQUESTED',
    'RETURN_PICKED',
    'RETURN_DELIVERED'
);


ALTER TYPE public.bookstatus OWNER TO baboook_deval;

--
-- TOC entry 923 (class 1247 OID 25544)
-- Name: rolerequeststatus; Type: TYPE; Schema: public; Owner: baboook_deval
--

CREATE TYPE public.rolerequeststatus AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public.rolerequeststatus OWNER TO baboook_deval;

--
-- TOC entry 869 (class 1247 OID 17246)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'OWNER',
    'READER',
    'VOLUNTEER',
    'SUPER_ADMIN'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 887 (class 1247 OID 17404)
-- Name: userrole; Type: TYPE; Schema: public; Owner: baboook_deval
--

CREATE TYPE public.userrole AS ENUM (
    'OWNER',
    'READER',
    'VOLUNTEER',
    'SUPER_ADMIN'
);


ALTER TYPE public.userrole OWNER TO baboook_deval;

--
-- TOC entry 902 (class 1247 OID 25132)
-- Name: wish_request_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.wish_request_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'FULFILLED',
    'REJECTED'
);


ALTER TYPE public.wish_request_status OWNER TO postgres;

--
-- TOC entry 899 (class 1247 OID 25127)
-- Name: wish_request_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.wish_request_type AS ENUM (
    'WANT_TO_READ',
    'WANT_TO_CONTRIBUTE'
);


ALTER TYPE public.wish_request_type OWNER TO postgres;

--
-- TOC entry 917 (class 1247 OID 25214)
-- Name: wishrequeststatus; Type: TYPE; Schema: public; Owner: baboook_deval
--

CREATE TYPE public.wishrequeststatus AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'FULFILLED',
    'REJECTED'
);


ALTER TYPE public.wishrequeststatus OWNER TO baboook_deval;

--
-- TOC entry 911 (class 1247 OID 25199)
-- Name: wishrequesttype; Type: TYPE; Schema: public; Owner: baboook_deval
--

CREATE TYPE public.wishrequesttype AS ENUM (
    'WANT_TO_READ',
    'WANT_TO_CONTRIBUTE'
);


ALTER TYPE public.wishrequesttype OWNER TO baboook_deval;

--
-- TOC entry 236 (class 1255 OID 17396)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 18499)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: baboook_deval
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO baboook_deval;

--
-- TOC entry 226 (class 1259 OID 17359)
-- Name: book_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.book_requests (
    id integer NOT NULL,
    book_id integer NOT NULL,
    reader_id integer NOT NULL,
    volunteer_id integer,
    delivery_address text NOT NULL,
    delivery_notes text,
    status public.book_status DEFAULT 'REQUESTED'::public.book_status NOT NULL,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    accepted_at timestamp without time zone,
    picked_at timestamp without time zone,
    delivered_at timestamp without time zone,
    issued_at timestamp without time zone,
    return_requested_at timestamp without time zone,
    return_picked_at timestamp without time zone,
    return_delivered_at timestamp without time zone,
    closed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.book_requests OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17358)
-- Name: book_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.book_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.book_requests_id_seq OWNER TO postgres;

--
-- TOC entry 5081 (class 0 OID 0)
-- Dependencies: 225
-- Name: book_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.book_requests_id_seq OWNED BY public.book_requests.id;


--
-- TOC entry 224 (class 1259 OID 17327)
-- Name: books; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.books (
    id integer NOT NULL,
    title character varying(500) NOT NULL,
    author character varying(300) NOT NULL,
    genre character varying(100) NOT NULL,
    language character varying(100) NOT NULL,
    description text,
    front_image character varying(500),
    back_image character varying(500),
    status public.book_status DEFAULT 'AVAILABLE'::public.book_status NOT NULL,
    library_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    age_group public.agegroup DEFAULT 'GENERIC'::public.agegroup NOT NULL
);


ALTER TABLE public.books OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17326)
-- Name: books_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.books_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.books_id_seq OWNER TO postgres;

--
-- TOC entry 5082 (class 0 OID 0)
-- Dependencies: 223
-- Name: books_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.books_id_seq OWNED BY public.books.id;


--
-- TOC entry 222 (class 1259 OID 17298)
-- Name: libraries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.libraries (
    id integer NOT NULL,
    name character varying(300) NOT NULL,
    description text,
    address text NOT NULL,
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    pincode character varying(20),
    latitude double precision,
    longitude double precision,
    contact_email character varying(255),
    contact_phone character varying(20),
    owner_id integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.libraries OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17297)
-- Name: libraries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.libraries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.libraries_id_seq OWNER TO postgres;

--
-- TOC entry 5083 (class 0 OID 0)
-- Dependencies: 221
-- Name: libraries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.libraries_id_seq OWNED BY public.libraries.id;


--
-- TOC entry 231 (class 1259 OID 25233)
-- Name: point_transactions; Type: TABLE; Schema: public; Owner: baboook_deval
--

CREATE TABLE public.point_transactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    points integer NOT NULL,
    reason character varying(100) NOT NULL,
    description character varying(500),
    created_at timestamp without time zone
);


ALTER TABLE public.point_transactions OWNER TO baboook_deval;

--
-- TOC entry 230 (class 1259 OID 25232)
-- Name: point_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: baboook_deval
--

CREATE SEQUENCE public.point_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.point_transactions_id_seq OWNER TO baboook_deval;

--
-- TOC entry 5084 (class 0 OID 0)
-- Dependencies: 230
-- Name: point_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: baboook_deval
--

ALTER SEQUENCE public.point_transactions_id_seq OWNED BY public.point_transactions.id;


--
-- TOC entry 235 (class 1259 OID 25576)
-- Name: role_requests; Type: TABLE; Schema: public; Owner: baboook_deval
--

CREATE TABLE public.role_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role public.userrole NOT NULL,
    status public.rolerequeststatus NOT NULL,
    requested_at timestamp without time zone,
    reviewed_at timestamp without time zone,
    reviewed_by_id integer,
    rejection_note text
);


ALTER TABLE public.role_requests OWNER TO baboook_deval;

--
-- TOC entry 234 (class 1259 OID 25575)
-- Name: role_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: baboook_deval
--

CREATE SEQUENCE public.role_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_requests_id_seq OWNER TO baboook_deval;

--
-- TOC entry 5085 (class 0 OID 0)
-- Dependencies: 234
-- Name: role_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: baboook_deval
--

ALTER SEQUENCE public.role_requests_id_seq OWNED BY public.role_requests.id;


--
-- TOC entry 233 (class 1259 OID 25552)
-- Name: user_role_assignments; Type: TABLE; Schema: public; Owner: baboook_deval
--

CREATE TABLE public.user_role_assignments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    role public.userrole NOT NULL,
    granted_at timestamp without time zone,
    granted_by_id integer
);


ALTER TABLE public.user_role_assignments OWNER TO baboook_deval;

--
-- TOC entry 232 (class 1259 OID 25551)
-- Name: user_role_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: baboook_deval
--

CREATE SEQUENCE public.user_role_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_role_assignments_id_seq OWNER TO baboook_deval;

--
-- TOC entry 5086 (class 0 OID 0)
-- Dependencies: 232
-- Name: user_role_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: baboook_deval
--

ALTER SEQUENCE public.user_role_assignments_id_seq OWNED BY public.user_role_assignments.id;


--
-- TOC entry 220 (class 1259 OID 17274)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(200) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    hashed_password character varying(255) NOT NULL,
    role public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_approved boolean DEFAULT false NOT NULL,
    address_line character varying(255),
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    latitude double precision,
    longitude double precision,
    reset_token character varying(255),
    reset_token_expires timestamp without time zone,
    last_active_role character varying(20),
    heard_from character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17273)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5087 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 229 (class 1259 OID 25152)
-- Name: wish_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wish_requests (
    id integer NOT NULL,
    type public.wish_request_type NOT NULL,
    requester_id integer NOT NULL,
    title character varying(500) NOT NULL,
    author character varying(300) NOT NULL,
    language character varying(100) NOT NULL,
    notes text,
    age_group character varying(20),
    condition public.book_condition,
    quantity integer DEFAULT 1 NOT NULL,
    front_image character varying(500),
    back_image character varying(500),
    target_library_id integer,
    status public.wish_request_status DEFAULT 'PENDING'::public.wish_request_status NOT NULL,
    admin_note text,
    reviewed_by_id integer,
    reviewed_at timestamp without time zone,
    book_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT wish_requests_age_group_check CHECK (((age_group)::text = ANY ((ARRAY['GENERIC'::character varying, 'TODDLER'::character varying, 'CHILDREN'::character varying, 'TEENAGER'::character varying, 'ADULT'::character varying])::text[])))
);


ALTER TABLE public.wish_requests OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 25151)
-- Name: wish_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wish_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wish_requests_id_seq OWNER TO postgres;

--
-- TOC entry 5088 (class 0 OID 0)
-- Dependencies: 228
-- Name: wish_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wish_requests_id_seq OWNED BY public.wish_requests.id;


--
-- TOC entry 4846 (class 2604 OID 17362)
-- Name: book_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_requests ALTER COLUMN id SET DEFAULT nextval('public.book_requests_id_seq'::regclass);


--
-- TOC entry 4841 (class 2604 OID 17330)
-- Name: books id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books ALTER COLUMN id SET DEFAULT nextval('public.books_id_seq'::regclass);


--
-- TOC entry 4837 (class 2604 OID 17301)
-- Name: libraries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libraries ALTER COLUMN id SET DEFAULT nextval('public.libraries_id_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 25236)
-- Name: point_transactions id; Type: DEFAULT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.point_transactions ALTER COLUMN id SET DEFAULT nextval('public.point_transactions_id_seq'::regclass);


--
-- TOC entry 4857 (class 2604 OID 25579)
-- Name: role_requests id; Type: DEFAULT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.role_requests ALTER COLUMN id SET DEFAULT nextval('public.role_requests_id_seq'::regclass);


--
-- TOC entry 4856 (class 2604 OID 25555)
-- Name: user_role_assignments id; Type: DEFAULT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.user_role_assignments ALTER COLUMN id SET DEFAULT nextval('public.user_role_assignments_id_seq'::regclass);


--
-- TOC entry 4832 (class 2604 OID 17277)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4850 (class 2604 OID 25155)
-- Name: wish_requests id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wish_requests ALTER COLUMN id SET DEFAULT nextval('public.wish_requests_id_seq'::regclass);


--
-- TOC entry 4885 (class 2606 OID 18504)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 4879 (class 2606 OID 17376)
-- Name: book_requests book_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_requests
    ADD CONSTRAINT book_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4871 (class 2606 OID 17346)
-- Name: books books_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_pkey PRIMARY KEY (id);


--
-- TOC entry 4869 (class 2606 OID 17317)
-- Name: libraries libraries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libraries
    ADD CONSTRAINT libraries_pkey PRIMARY KEY (id);


--
-- TOC entry 4894 (class 2606 OID 25244)
-- Name: point_transactions point_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4905 (class 2606 OID 25587)
-- Name: role_requests role_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4898 (class 2606 OID 25562)
-- Name: user_role_assignments uq_user_role; Type: CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT uq_user_role UNIQUE (user_id, role);


--
-- TOC entry 4900 (class 2606 OID 25560)
-- Name: user_role_assignments user_role_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 4862 (class 2606 OID 17294)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4864 (class 2606 OID 17292)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4890 (class 2606 OID 25174)
-- Name: wish_requests wish_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wish_requests
    ADD CONSTRAINT wish_requests_pkey PRIMARY KEY (id);


--
-- TOC entry 4872 (class 1259 OID 17357)
-- Name: idx_book_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_book_author ON public.books USING btree (author);


--
-- TOC entry 4873 (class 1259 OID 17354)
-- Name: idx_book_genre; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_book_genre ON public.books USING btree (genre);


--
-- TOC entry 4874 (class 1259 OID 17355)
-- Name: idx_book_language; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_book_language ON public.books USING btree (language);


--
-- TOC entry 4875 (class 1259 OID 17352)
-- Name: idx_book_library; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_book_library ON public.books USING btree (library_id);


--
-- TOC entry 4876 (class 1259 OID 17353)
-- Name: idx_book_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_book_status ON public.books USING btree (status);


--
-- TOC entry 4877 (class 1259 OID 17356)
-- Name: idx_book_title; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_book_title ON public.books USING gin (to_tsvector('english'::regconfig, (title)::text));


--
-- TOC entry 4865 (class 1259 OID 17325)
-- Name: idx_library_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_library_active ON public.libraries USING btree (is_active);


--
-- TOC entry 4866 (class 1259 OID 17323)
-- Name: idx_library_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_library_city ON public.libraries USING btree (city);


--
-- TOC entry 4867 (class 1259 OID 17324)
-- Name: idx_library_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_library_owner ON public.libraries USING btree (owner_id);


--
-- TOC entry 4891 (class 1259 OID 25251)
-- Name: idx_pt_user; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX idx_pt_user ON public.point_transactions USING btree (user_id);


--
-- TOC entry 4880 (class 1259 OID 17394)
-- Name: idx_request_book; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_book ON public.book_requests USING btree (book_id);


--
-- TOC entry 4881 (class 1259 OID 17392)
-- Name: idx_request_reader; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_reader ON public.book_requests USING btree (reader_id);


--
-- TOC entry 4882 (class 1259 OID 17395)
-- Name: idx_request_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_status ON public.book_requests USING btree (status);


--
-- TOC entry 4883 (class 1259 OID 17393)
-- Name: idx_request_volunteer; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_request_volunteer ON public.book_requests USING btree (volunteer_id);


--
-- TOC entry 4901 (class 1259 OID 25600)
-- Name: idx_rr_status; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX idx_rr_status ON public.role_requests USING btree (status);


--
-- TOC entry 4902 (class 1259 OID 25599)
-- Name: idx_rr_user; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX idx_rr_user ON public.role_requests USING btree (user_id);


--
-- TOC entry 4895 (class 1259 OID 25573)
-- Name: idx_ura_user; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX idx_ura_user ON public.user_role_assignments USING btree (user_id);


--
-- TOC entry 4859 (class 1259 OID 17295)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4860 (class 1259 OID 17296)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 4886 (class 1259 OID 25195)
-- Name: idx_wishreq_requester; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wishreq_requester ON public.wish_requests USING btree (requester_id);


--
-- TOC entry 4887 (class 1259 OID 25196)
-- Name: idx_wishreq_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wishreq_status ON public.wish_requests USING btree (status);


--
-- TOC entry 4888 (class 1259 OID 25197)
-- Name: idx_wishreq_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wishreq_type ON public.wish_requests USING btree (type);


--
-- TOC entry 4892 (class 1259 OID 25250)
-- Name: ix_point_transactions_id; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX ix_point_transactions_id ON public.point_transactions USING btree (id);


--
-- TOC entry 4903 (class 1259 OID 25598)
-- Name: ix_role_requests_id; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX ix_role_requests_id ON public.role_requests USING btree (id);


--
-- TOC entry 4896 (class 1259 OID 25574)
-- Name: ix_user_role_assignments_id; Type: INDEX; Schema: public; Owner: baboook_deval
--

CREATE INDEX ix_user_role_assignments_id ON public.user_role_assignments USING btree (id);


--
-- TOC entry 4923 (class 2620 OID 17400)
-- Name: book_requests trg_book_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_book_requests_updated_at BEFORE UPDATE ON public.book_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4922 (class 2620 OID 17399)
-- Name: books trg_books_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4921 (class 2620 OID 17398)
-- Name: libraries trg_libraries_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_libraries_updated_at BEFORE UPDATE ON public.libraries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4920 (class 2620 OID 17397)
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4908 (class 2606 OID 17377)
-- Name: book_requests book_requests_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_requests
    ADD CONSTRAINT book_requests_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE RESTRICT;


--
-- TOC entry 4909 (class 2606 OID 17382)
-- Name: book_requests book_requests_reader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_requests
    ADD CONSTRAINT book_requests_reader_id_fkey FOREIGN KEY (reader_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4910 (class 2606 OID 17387)
-- Name: book_requests book_requests_volunteer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.book_requests
    ADD CONSTRAINT book_requests_volunteer_id_fkey FOREIGN KEY (volunteer_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4907 (class 2606 OID 17347)
-- Name: books books_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.books
    ADD CONSTRAINT books_library_id_fkey FOREIGN KEY (library_id) REFERENCES public.libraries(id) ON DELETE RESTRICT;


--
-- TOC entry 4906 (class 2606 OID 17318)
-- Name: libraries libraries_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.libraries
    ADD CONSTRAINT libraries_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4915 (class 2606 OID 25245)
-- Name: point_transactions point_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.point_transactions
    ADD CONSTRAINT point_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4918 (class 2606 OID 25593)
-- Name: role_requests role_requests_reviewed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_reviewed_by_id_fkey FOREIGN KEY (reviewed_by_id) REFERENCES public.users(id);


--
-- TOC entry 4919 (class 2606 OID 25588)
-- Name: role_requests role_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.role_requests
    ADD CONSTRAINT role_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4916 (class 2606 OID 25568)
-- Name: user_role_assignments user_role_assignments_granted_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_granted_by_id_fkey FOREIGN KEY (granted_by_id) REFERENCES public.users(id);


--
-- TOC entry 4917 (class 2606 OID 25563)
-- Name: user_role_assignments user_role_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: baboook_deval
--

ALTER TABLE ONLY public.user_role_assignments
    ADD CONSTRAINT user_role_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 4911 (class 2606 OID 25190)
-- Name: wish_requests wish_requests_book_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wish_requests
    ADD CONSTRAINT wish_requests_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE SET NULL;


--
-- TOC entry 4912 (class 2606 OID 25175)
-- Name: wish_requests wish_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wish_requests
    ADD CONSTRAINT wish_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4913 (class 2606 OID 25185)
-- Name: wish_requests wish_requests_reviewed_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wish_requests
    ADD CONSTRAINT wish_requests_reviewed_by_id_fkey FOREIGN KEY (reviewed_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- TOC entry 4914 (class 2606 OID 25180)
-- Name: wish_requests wish_requests_target_library_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wish_requests
    ADD CONSTRAINT wish_requests_target_library_id_fkey FOREIGN KEY (target_library_id) REFERENCES public.libraries(id) ON DELETE SET NULL;


--
-- TOC entry 5076 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO baboook_deval;


--
-- TOC entry 5077 (class 0 OID 0)
-- Dependencies: 896
-- Name: TYPE agegroup; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TYPE public.agegroup TO baboook_deval;


--
-- TOC entry 5078 (class 0 OID 0)
-- Dependencies: 905
-- Name: TYPE book_condition; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TYPE public.book_condition TO baboook_deval;


--
-- TOC entry 5079 (class 0 OID 0)
-- Dependencies: 902
-- Name: TYPE wish_request_status; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TYPE public.wish_request_status TO baboook_deval;


--
-- TOC entry 5080 (class 0 OID 0)
-- Dependencies: 899
-- Name: TYPE wish_request_type; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TYPE public.wish_request_type TO baboook_deval;


--
-- TOC entry 2128 (class 826 OID 17402)
-- Name: DEFAULT PRIVILEGES FOR TYPES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TYPES TO baboook_deval;


-- Completed on 2026-09-25 18:39:49

--
-- PostgreSQL database dump complete
--

\unrestrict cSvVBOYND8489e5J05gF9s8fmi8DjoEBxekQZCZC1uaczdWg8sg7Z5bYC1z2IVN

