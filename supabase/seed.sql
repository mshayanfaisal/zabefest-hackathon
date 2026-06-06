-- KarachiPulse demo seed — ~18 reports across Karachi neighborhoods.
-- Run AFTER 001_initial_schema.sql. Inserts with severity pre-set so the
-- prepare_report() rule-based default is skipped (these are curated values).
-- user_id is left null (seed rows aren't owned by a device).
--
-- NOTE: prepare_report() runs on insert and may flag near-duplicates as
-- 'duplicate'. Coordinates below are spread out to avoid that. Statuses are
-- set via UPDATE after insert (insert forces 'pending'/'duplicate' defaults).

-- Disable the rate-limit/dedup trigger during seeding for predictability.
alter table reports disable trigger reports_prepare;

insert into reports (category, sub_type, description, lat, lng, severity_score, severity_reason, department, status, verification_count, is_sos, created_at) values
  ('infrastructure', 'pothole',       'Large pothole near Hassan Square underpass, damaging vehicles.', 24.9180, 67.0971, 6, 'Vehicle damage risk on a major artery.', 'KMC',  'verified',    5, false, now() - interval '2 hours'),
  ('infrastructure', 'garbage',       'Garbage pile overflowing for a week at Gulshan Block 5.',        24.9220, 67.0840, 4, 'Sanitation hazard, no life threat.',     'SSWMB','assigned',    3, false, now() - interval '5 hours'),
  ('infrastructure', 'streetlight',   'Three streetlights dead on University Road, unsafe at night.',   24.9290, 67.1120, 5, 'Night safety risk for pedestrians.',     'KE',   'in_progress', 4, false, now() - interval '1 day'),
  ('infrastructure', 'sewerage',      'Sewerage line burst flooding the street in PECHS Block 2.',      24.8710, 67.0640, 7, 'Health hazard and road flooding.',       'KWSB', 'pending',     2, false, now() - interval '3 hours'),
  ('infrastructure', 'pothole',       'Series of potholes on Shahrah-e-Faisal service road.',           24.8620, 67.0720, 5, 'Traffic slowdown and vehicle wear.',     'KMC',  'verified',    6, false, now() - interval '8 hours'),
  ('infrastructure', 'garbage',       'Uncollected garbage near Saddar Empress Market.',                24.8560, 67.0220, 4, 'Sanitation issue in a busy market.',     'SSWMB','pending',     1, false, now() - interval '30 minutes'),

  ('safety',         'unsafe_zone',   'Poorly lit alley behind Korangi market, frequent snatching.',    24.8330, 67.1340, 6, 'Repeated street crime reported.',        'Police','verified',    7, false, now() - interval '6 hours'),
  ('safety',         'harassment',    'Harassment hotspot reported near a bus stop in Nazimabad.',      24.9120, 67.0330, 7, 'Repeated harassment of commuters.',      'Police','assigned',    5, false, now() - interval '1 day'),
  ('safety',         'disaster',      'Building facade cracking and shedding debris in old Saddar.',    24.8540, 67.0260, 8, 'Structural collapse risk to passersby.', 'PDMA', 'in_progress', 4, false, now() - interval '12 hours'),
  ('safety',         'unsafe_zone',   'Open manhole without cover on a footpath in Gulistan-e-Johar.',  24.9260, 67.1300, 6, 'Fall hazard, especially at night.',      'KWSB', 'pending',     2, false, now() - interval '4 hours'),

  ('utility',        'water',         'No water supply for 5 days in North Nazimabad Block H.',         24.9610, 67.0360, 7, 'Prolonged water shortage for residents.','KWSB', 'verified',    8, false, now() - interval '2 days'),
  ('utility',        'water',         'Water tanker mafia overcharging in Lyari, no line supply.',      24.8770, 66.9990, 7, 'Essential service denial.',              'KWSB', 'pending',     3, false, now() - interval '7 hours'),
  ('utility',        'load_shedding', 'Unannounced 8-hour load shedding in Malir despite no faults.',   24.8930, 67.2050, 4, 'Extended power outage, quality of life.','KE',   'assigned',    4, false, now() - interval '1 day'),
  ('utility',        'load_shedding', 'Frequent power trips damaging appliances in Clifton Block 2.',   24.8120, 67.0290, 4, 'Voltage instability damaging devices.',  'KE',   'pending',     1, false, now() - interval '3 hours'),
  ('utility',        'water',         'Contaminated water complaints in Orangi Town sector 11.',        24.9540, 66.9870, 7, 'Public health risk from contamination.', 'KWSB', 'in_progress', 6, false, now() - interval '18 hours'),

  ('infrastructure', 'streetlight',   'Entire stretch of Rashid Minhas Road unlit after storm.',        24.9330, 67.0990, 5, 'Major road unlit, accident risk.',       'KE',   'resolved',    9, false, now() - interval '3 days'),
  ('safety',         'unsafe_zone',   'Stray dog pack attacks reported near Federal B Area park.',      24.9410, 67.0570, 6, 'Repeated animal attacks on residents.',  'KMC',  'pending',     2, false, now() - interval '5 hours'),

  -- One active emergency SOS for the demo.
  ('safety',         'sos',           'EMERGENCY SOS — immediate assistance required',                 24.8607, 67.0011, 10,'Citizen-triggered emergency alert.',     'Rangers','pending',   0, true,  now() - interval '10 minutes');

alter table reports enable trigger reports_prepare;
