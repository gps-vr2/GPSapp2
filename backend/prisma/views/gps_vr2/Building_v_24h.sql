SELECT
  `b`.`idBuilding` AS `id`,
  `b`.`lat` AS `lat`,
  `b`.`long` AS `long`,
  `b`.`address` AS `address`,
  `b`.`last_modified` AS `last_modified`,
  count(`d`.`idDoor`) AS `numberOfDoors`,
  max(`d`.`information_name`) AS `info`,
  `d`.`language` AS `language`,
  `d`.`id_cong_app` AS `congregationId`,
  `l`.`Color` AS `pinColor`,
  concat('/pins/pin', `l`.`Color`, '.png') AS `pinImage`
FROM
  (
    (
      `gps_vr2`.`Building` `b`
      LEFT JOIN `gps_vr2`.`Door` `d` ON((`d`.`building_id` = `b`.`idBuilding`))
    )
    LEFT JOIN `gps_vr2`.`Language` `l` ON(
      (
        (`l`.`id_cong_app` = `d`.`id_cong_app`)
        AND (`l`.`name` = `d`.`language`)
      )
    )
  )
WHERE
  (`b`.`last_modified` >= (NOW() - INTERVAL 1 DAY))
GROUP BY
  `b`.`idBuilding`,
  `b`.`lat`,
  `b`.`long`,
  `b`.`address`,
  `b`.`last_modified`,
  `d`.`language`,
  `d`.`id_cong_app`,
  `l`.`Color`