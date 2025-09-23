 schemaname |       tablename        | tableowner | table_count 
------------+------------------------+------------+-------------
 public     | allowed_email_domains  | postgres   |           1
 public     | allowed_emails         | postgres   |           1
 public     | baseline_results       | postgres   |           1
 public     | construction_sets      | postgres   |           1
 public     | constructions          | postgres   |           1
 public     | layers                 | postgres   |           1
 public     | materials              | postgres   |           1
 public     | scenario_constructions | postgres   |           1
 public     | scenario_results       | postgres   |           1
 public     | scenarios              | postgres   |           1
 public     | simulation_files       | postgres   |           1
 public     | simulation_runs        | postgres   |           1
 public     | user_preferences       | postgres   |           1
 public     | user_profiles          | postgres   |           1
 public     | user_sessions          | postgres   |           1
 public     | window_glazing         | postgres   |           1
(16 rows)

 schemaname |       tablename        | size  
------------+------------------------+-------
 public     | allowed_email_domains  | 64 kB
 public     | allowed_emails         | 64 kB
 public     | scenario_constructions | 48 kB
 public     | constructions          | 48 kB
 public     | materials              | 48 kB
 public     | window_glazing         | 48 kB
 public     | construction_sets      | 48 kB
 public     | layers                 | 40 kB
 public     | scenarios              | 32 kB
 public     | user_preferences       | 24 kB
 public     | scenario_results       | 16 kB
 public     | simulation_files       | 16 kB
 public     | baseline_results       | 16 kB
 public     | user_profiles          | 16 kB
 public     | simulation_runs        | 16 kB
 public     | user_sessions          | 16 kB
(16 rows)

-- Row count for allowed_email_domains
      table_name       | row_count 
-----------------------+-----------
 allowed_email_domains |         1
(1 row)


-- Row count for allowed_emails
   table_name   | row_count 
----------------+-----------
 allowed_emails |         5
(1 row)


-- Row count for baseline_results
    table_name    | row_count 
------------------+-----------
 baseline_results |         0
(1 row)


-- Row count for construction_sets
    table_name     | row_count 
-------------------+-----------
 construction_sets |         3
(1 row)


-- Row count for constructions
  table_name   | row_count 
---------------+-----------
 constructions |         5
(1 row)


-- Row count for layers
 table_name | row_count 
------------+-----------
 layers     |        13
(1 row)


-- Row count for materials
 table_name | row_count 
------------+-----------
 materials  |         6
(1 row)


-- Row count for scenario_constructions
       table_name       | row_count 
------------------------+-----------
 scenario_constructions |         5
(1 row)


-- Row count for scenario_results
    table_name    | row_count 
------------------+-----------
 scenario_results |         0
(1 row)


-- Row count for scenarios
 table_name | row_count 
------------+-----------
 scenarios  |         1
(1 row)


-- Row count for simulation_files
    table_name    | row_count 
------------------+-----------
 simulation_files |         0
(1 row)


-- Row count for simulation_runs
   table_name    | row_count 
-----------------+-----------
 simulation_runs |         0
(1 row)


-- Row count for user_preferences
    table_name    | row_count 
------------------+-----------
 user_preferences |         0
(1 row)


-- Row count for user_profiles
  table_name   | row_count 
---------------+-----------
 user_profiles |         0
(1 row)


-- Row count for user_sessions
  table_name   | row_count 
---------------+-----------
 user_sessions |         0
(1 row)


-- Row count for window_glazing
   table_name   | row_count 
----------------+-----------
 window_glazing |         3
(1 row)


