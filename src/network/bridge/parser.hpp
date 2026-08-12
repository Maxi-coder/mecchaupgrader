#pragma once

#include <cstddef>
#include <cstdint>
#include <cstring>
#include <string>

namespace bridge_parser {
    inline bool read_bytes(const std::string& data, size_t& offset, void* out, size_t size) {
        if (offset + size > data.size()) return false;
        std::memcpy(out, data.data() + offset, size);
        offset += size;
        return true;
    }

    inline bool read_u8(const std::string& data, size_t& offset, uint8_t& out) {
        return read_bytes(data, offset, &out, sizeof(out));
    }

    inline bool read_i8(const std::string& data, size_t& offset, int8_t& out) {
        return read_bytes(data, offset, &out, sizeof(out));
    }

    inline bool read_u16(const std::string& data, size_t& offset, uint16_t& out) {
        return read_bytes(data, offset, &out, sizeof(out));
    }

    inline bool read_u32(const std::string& data, size_t& offset, uint32_t& out) {
        return read_bytes(data, offset, &out, sizeof(out));
    }

    inline bool read_f32(const std::string& data, size_t& offset, float& out) {
        return read_bytes(data, offset, &out, sizeof(out));
    }
}
