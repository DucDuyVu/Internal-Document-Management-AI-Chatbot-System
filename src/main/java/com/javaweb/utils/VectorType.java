package com.javaweb.utils;

import com.pgvector.PGvector;
import org.hibernate.HibernateException;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.UserType;

import java.io.Serializable;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.Objects;

/**
 * Hibernate 6 custom UserType: map Java float[] <-> cột Postgres VECTOR(3072) (pgvector).
 * Dùng chung thư viện "pgvector-java" (đã có sẵn trong pom.xml) chỉ để mượn class
 * PGvector làm cầu nối convert String <-> float[], KHÔNG dùng phần Hibernate
 * dựng sẵn của thư viện (nếu có) để tự kiểm soát toàn bộ logic.
 */
public class VectorType implements UserType<float[]> {

    @Override
    public int getSqlType() {
        // pgvector không có hằng số JDBC riêng -> dùng OTHER, driver Postgres sẽ
        // tự nhận diện qua chuỗi text "[1,2,3]" khi setObject.
        return Types.OTHER;
    }

    @Override
    public Class<float[]> returnedClass() {
        return float[].class;
    }

    @Override
    public boolean equals(float[] x, float[] y) {
        return Objects.deepEquals(x, y);
    }

    @Override
    public int hashCode(float[] x) {
        return Objects.hashCode(x);
    }

    @Override
    public float[] nullSafeGet(ResultSet rs, int position, SharedSessionContractImplementor session, Object owner)
            throws SQLException {
        String raw = rs.getString(position);
        if (raw == null) {
            return null;
        }
        PGvector vector = new PGvector(raw);
        return vector.toArray();
    }

    @Override
    public void nullSafeSet(PreparedStatement st, float[] value, int index, SharedSessionContractImplementor session)
            throws SQLException {
        if (value == null) {
            st.setNull(index, Types.OTHER);
        } else {
            st.setObject(index, new PGvector(value), Types.OTHER);
        }
    }

    @Override
    public float[] deepCopy(float[] value) {
        return value == null ? null : value.clone();
    }

    @Override
    public boolean isMutable() {
        return true;
    }

    @Override
    public Serializable disassemble(float[] value) {
        return value == null ? null : value.clone();
    }

    @Override
    public float[] assemble(Serializable cached, Object owner) {
        return cached == null ? null : ((float[]) cached).clone();
    }
}