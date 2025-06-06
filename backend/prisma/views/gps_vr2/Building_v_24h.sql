SELECT
  `b`.`lat` AS `lat`,
  `b`.`long` AS `long`,
  `b`.`last_modified` AS `last_modified`
FROM
  `gps_vr2`.`Building` `b`
WHERE
  (`b`.`last_modified` >= (NOW() - INTERVAL 1 DAY))