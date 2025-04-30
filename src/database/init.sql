CREATE TABLE IF NOT EXISTS customers (
    customer_code VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS images (
    image_id SERIAL PRIMARY KEY,
    customer_code VARCHAR(255) NOT NULL,
    image_url TEXT NOT NULL,
    measure_datetime TIMESTAMP NOT NULL,
    measure_type VARCHAR(10) CHECK (measure_type IN ('WATER', 'GAS')),
    measure_value NUMERIC,
    has_confirmed BOOLEAN DEFAULT false,
    measure_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    measure_month DATE GENERATED ALWAYS AS (DATE_TRUNC('month', measure_datetime)) STORED,
    FOREIGN KEY (customer_code) REFERENCES customers(customer_code) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_monthly_reading ON images (
    customer_code, 
    measure_type, 
    measure_month
);