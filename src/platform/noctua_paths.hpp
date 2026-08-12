#pragma once

#include <Windows.h>
#include <filesystem>
#include <mutex>
#include <string>

namespace noctua_paths {
    inline std::filesystem::path local_root() {
        char buffer[MAX_PATH] = {};
        DWORD size = GetEnvironmentVariableA("LOCALAPPDATA", buffer, static_cast<DWORD>(sizeof(buffer)));
        if (size > 0 && size < sizeof(buffer)) {
            return std::filesystem::path(buffer) / "noctua";
        }

        size = GetEnvironmentVariableA("USERPROFILE", buffer, static_cast<DWORD>(sizeof(buffer)));
        if (size > 0 && size < sizeof(buffer)) {
            return std::filesystem::path(buffer) / "AppData" / "Local" / "noctua";
        }

        return std::filesystem::path("noctua");
    }

    inline std::string local_root_string() {
        return local_root().string();
    }

    inline std::filesystem::path legacy_root() {
        return std::filesystem::path("C:\\noctua");
    }

    inline void ensure_local_root() {
        std::filesystem::create_directories(local_root());
    }

    inline std::filesystem::path conflict_target(const std::filesystem::path& target) {
        if (!std::filesystem::exists(target)) {
            return target;
        }

        const auto parent = target.parent_path();
        const auto stem = target.stem().string();
        const auto extension = target.extension().string();
        for (int index = 1; index < 1000; ++index) {
            const auto candidate = parent / (stem + ".legacy" + std::to_string(index) + extension);
            if (!std::filesystem::exists(candidate)) {
                return candidate;
            }
        }

        return parent / (stem + ".legacy" + std::to_string(GetTickCount64()) + extension);
    }

    inline bool migrate_legacy_root() {
        static std::mutex mutex;
        static bool attempted = false;
        std::lock_guard<std::mutex> lock(mutex);
        if (attempted) {
            return false;
        }
        attempted = true;

        const auto legacy = legacy_root();
        std::error_code ec;
        if (!std::filesystem::exists(legacy, ec)) {
            return false;
        }

        const auto target_root = local_root();
        std::filesystem::create_directories(target_root, ec);
        if (ec) {
            return false;
        }

        for (const auto& entry : std::filesystem::directory_iterator(legacy, ec)) {
            if (ec) {
                break;
            }

            const auto target = conflict_target(target_root / entry.path().filename());
            std::filesystem::rename(entry.path(), target, ec);
            if (!ec) {
                continue;
            }

            ec.clear();
            if (entry.is_directory()) {
                std::filesystem::copy(entry.path(), target, std::filesystem::copy_options::recursive, ec);
                if (!ec) {
                    std::filesystem::remove_all(entry.path(), ec);
                }
            } else {
                std::filesystem::copy_file(entry.path(), target, std::filesystem::copy_options::none, ec);
                if (!ec) {
                    std::filesystem::remove(entry.path(), ec);
                }
            }
            ec.clear();
        }

        std::filesystem::remove_all(legacy, ec);
        return true;
    }
}
