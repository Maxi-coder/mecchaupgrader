#pragma once

namespace hacks {
    inline bool was_no_veh_collision_set = false;

    inline void set_vehicle_collision(native::type::any vehicle, bool enabled) {
        for (auto object : game::object_list) {
            if (IsValidPtr(object)) {
                const auto handle = pointer_to_handle(reinterpret_cast<uintptr_t>(object));
                if (handle) {
                    native::entity::set_entity_no_collision_entity(vehicle, handle, enabled);
                }
            }
        }

        for (auto other_vehicle : game::vehicle_list) {
            if (IsValidPtr(other_vehicle)) {
                const auto handle = pointer_to_handle(reinterpret_cast<uintptr_t>(other_vehicle));
                if (handle) {
                    native::entity::set_entity_no_collision_entity(vehicle, handle, enabled);
                }
            }
        }

        for (auto& entry : game::ped_list) {
            CObject* ped = entry.first;
            if (IsValidPtr(ped) && ped != local.player) {
                const auto handle = pointer_to_handle(reinterpret_cast<uintptr_t>(ped));
                if (handle) {
                    native::entity::set_entity_no_collision_entity(vehicle, handle, enabled);
                }
            }
        }
    }

    inline void disable_veh_no_collision() {
        if (!was_no_veh_collision_set) {
            return;
        }

        if (local.player->IsInVehicle()) {
            CVehicle* vehicle = local.player->vehicle();
            const auto ped = local_ped_handle();
            const auto handle = ped ? native::ped::get_vehicle_ped_is_in(ped, false) : 0;
            if (IsValidPtr(vehicle)) {
                vehicle->setCollision(0.25f);
            }
            if (handle) {
                set_vehicle_collision(handle, false);
            }
        }

        was_no_veh_collision_set = false;
    }

    inline void do_veh_no_collision() {
        if (!local.player->IsInVehicle()) {
            was_no_veh_collision_set = false;
            return;
        }

        CVehicle* vehicle = local.player->vehicle();
        if (!IsValidPtr(vehicle)) {
            return;
        }

        const auto ped = local_ped_handle();
        if (!ped) {
            return;
        }

        const auto handle = native::ped::get_vehicle_ped_is_in(ped, false);
        if (!handle) {
            return;
        }

        const bool enabled = unsafe_mode_enabled() && config::get("hacks", "no_collision_veh", 0) != 0;
        if (enabled) {
            was_no_veh_collision_set = true;
            vehicle->setCollision(-1.0f);
            set_vehicle_collision(handle, true);
            return;
        }

        if (was_no_veh_collision_set) {
            disable_veh_no_collision();
        }
    }
}
