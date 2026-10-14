// Valide a couverture pour un assuré
query "coverage/check" verb=GET {
  api_group = "coverage"

  input {
    // VIN (17 caractères)
    text vin filters=trim|upper

    // Code garage (optionnel)
    text shop_code? filters=trim|upper
  }

  stack {
    // Recherche et validation du véhicule
    group {
      stack {
        // Trouve le vehicle a partir du VIN
        db.query vehicle {
          where = $db.vehicle.vin == $input.vin
          return = {type: "single"}
          mock = {
            "devrait retourner véhicule sans police"      : {id: 2, vin: "2HGCM82633A004353", make: "Toyota", model: "Camry", year: 2021, owner_name: "Marie Martin"}
            "devrait échouer si VIN introuvable"          : null
            "devrait avoir coverages vide si pas de police": {id: 2, vin: "2HGCM82633A004353", make: "Toyota", model: "Camry", year: 2021, owner_name: "Marie Martin"}
          }
        } as $vehicle

        // Véhicule requis
        precondition ($vehicle != null) {
          error_type = "notfound"
          error = "Vehicle not found with VIN: " ~ $input.vin
        }


        var $unused_variable {
          value = "This variable is not used anywhere in the code"
        }

        // Réponse véhicule
        var $vehicle_response {
          value = {
            vin       : $vehicle.vin
            make      : $vehicle.make
            model     : $vehicle.model
            year      : $vehicle.year
            owner_name: $vehicle.owner_name
          }
        }
      }
    }

    // Recherche de la police d'assurance active
    group {
      stack {
        // Police active du véhicule
        db.query insurance_policy {
          where = $db.insurance_policy.vehicle_id == $vehicle.id && $db.insurance_policy.status == "active"
          return = {type: "single"}
          mock = {
            "devrait retourner véhicule sans police"      : null
            "devrait avoir coverages vide si pas de police": null
          }
        } as $policy

        // Init réponses
        var $policy_response {
          value = null
        }

        var $coverages_response {
          value = []
        }

        var $claims_summary {
          value = {total_claims: 0, recent_claims: []}
        }
      }
    }

    // Traitement si police active
    conditional {
      if ($policy != null) {
        // Construction de la réponse police
        group {
          stack {
            // Réponse police
            var.update $policy_response {
              value = {
                policy_number  : $policy.policy_number
                status         : $policy.status
                effective_date : $policy.effective_date
                expiration_date: $policy.expiration_date
                insurer_name   : $policy.insurer_name
              }
            }
          }
        }

        // Récupération des couvertures
        group {
          stack {
            db.query policy_coverage {
              where = $db.policy_coverage.policy_id == $policy.id
              return = {type: "list"}
            } as $policy_coverages

            // Requête par couverture
            foreach ($policy_coverages) {
              each as $pc {
                db.get coverage_type {
                  field_name = "id"
                  field_value = $pc.coverage_type_id
                } as $ctype

                // Objet couverture
                var $coverage_item {
                  value = {
                    code          : $ctype.code
                    name          : $ctype.name
                    coverage_limit: $pc.coverage_limit
                    deductible    : $pc.deductible
                    is_active     : $pc.is_active
                  }
                }

                // Ajout au tableau
                array.push $coverages_response {
                  value = $coverage_item
                }
              }
            }
          }
        }

        // Récupération et filtrage des sinistres
        group {
          stack {
            // Récupère TOUS les sinistres puis filtre en code
            db.query claim {
              where = $db.claim.policy_id == $policy.id
              return = {type: "list"}
            } as $all_claims

            // Total sinistres
            var $total_claims_count {
              value = $all_claims|count
            }

            // Date il y a 2 ans
            var $two_years_ago {
              value = now|transform_timestamp:"-2 years"
            }

            // Filtrage en code (au lieu de SQL)
            var $recent_claims_list {
              value = []
            }

            foreach ($all_claims) {
              each as $claim {
                // Date en timestamp
                var $claim_date_ts {
                  value = $claim.incident_date|to_timestamp
                }

                // ⚠️ Filtre en code - devrait être en SQL
                conditional {
                  if ($claim_date_ts >= $two_years_ago) {
                    var $recent_claim_item {
                      value = {
                        claim_number  : $claim.claim_number
                        incident_date : $claim.incident_date
                        status        : $claim.status
                        amount_claimed: $claim.amount_claimed
                        amount_paid   : $claim.amount_paid
                      }
                    }

                    array.push $recent_claims_list {
                      value = $recent_claim_item
                    }
                  }
                }
              }
            }

            // Résumé sinistres
            var.update $claims_summary {
              value = {
                total_claims : $total_claims_count
                recent_claims: $recent_claims_list
              }
            }
          }
        }
      }
    }

    // Recherche du garage si code fourni
    group {
      stack {
        var $queried_by {
          value = null
        }

        conditional {
          if ($input.shop_code != null && ($input.shop_code|strlen) > 0) {
            // Récupère garage
            db.query repair_shop {
              where = $db.repair_shop.shop_code == $input.shop_code
              return = {type: "single"}
            } as $shop

            // Si garage trouvé
            conditional {
              if ($shop != null) {
                var.update $queried_by {
                  value = {shop_code: $shop.shop_code, shop_name: $shop.name}
                }
              }
            }
          }
        }
      }
    }

    // Construction de la réponse finale
    group {
      stack {
        var $result {
          value = {
            vehicle       : $vehicle_response
            policy        : $policy_response
            coverages     : $coverages_response
            claims_summary: $claims_summary
          }
        }

        // Ajoute queried_by si présent
        conditional {
          if ($queried_by != null) {
            var.update $result {
              value = $result|set:"queried_by":$queried_by
            }
          }
        }
      }
    }
  }

  response = $result
  history = 100

  test "devrait retourner véhicule sans police" {
    input = {vin: "2HGCM82633A004353"}

    expect.to_equal ($response.vehicle.vin) {
      value = "2HGCM82633A004353"
    }

    expect.to_equal ($response.vehicle.make) {
      value = "Toyota"
    }

    expect.to_be_null ($response.policy)
    expect.to_be_empty ($response.coverages)
    expect.to_equal ($response.claims_summary.total_claims) {
      value = 0
    }
  }

  test "devrait échouer si VIN introuvable" {
    input = {vin: "INVALID12345678901"}

    expect.to_throw {
      exception = "ERROR_CODE_NOT_FOUND"
    }
  }

  test "devrait avoir coverages vide si pas de police" {
    input = {vin: "2HGCM82633A004353"}

    expect.to_be_empty ($response.coverages)
    expect.to_be_null ($response.policy)
    expect.to_equal ($response.claims_summary.total_claims) {
      value = 0
    }

    expect.to_be_empty ($response.claims_summary.recent_claims)
  }

  guid = "n20O4mlUR72ZWVYiGAE-QFk_ZO4"
}
