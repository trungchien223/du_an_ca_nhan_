import * as yup from "yup";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_NUMBER_REGEX = /^(?:\+?84|0)(?:\d){9}$/;
const PASSWORD_STRONG_REGEX =
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]{6,}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const trimString = (schema) => schema.transform((value) => value?.trim?.() ?? value);

export const loginSchema = yup.object({
  phone: trimString(yup.string())
    .required("Vui lòng nhập số điện thoại.")
    .matches(PHONE_NUMBER_REGEX, "Số điện thoại không hợp lệ."),
  password: yup
    .string()
    .required("Vui lòng nhập mật khẩu."),
});

export const registerSchema = yup.object({
  phone: trimString(yup.string())
    .required("Vui lòng nhập số điện thoại.")
    .matches(PHONE_NUMBER_REGEX, "Số điện thoại không hợp lệ."),
  email: trimString(
    yup
      .string()
      .nullable()
      .transform((value) => (value === "" ? null : value))
  )
    .notRequired()
    .test(
      "email-format",
      "Email không hợp lệ.",
      (value) => !value || EMAIL_REGEX.test(value)
    ),
  password: yup
    .string()
    .required("Vui lòng nhập mật khẩu.")
    .min(6, "Mật khẩu phải có ít nhất 6 ký tự.")
    .matches(
      PASSWORD_STRONG_REGEX,
      "Mật khẩu cần chứa ít nhất một chữ cái và một chữ số."
    ),
  confirmPassword: yup
    .string()
    .required("Vui lòng xác nhận mật khẩu.")
    .oneOf([yup.ref("password"), null], "Mật khẩu và xác nhận mật khẩu không khớp."),
});

export const completeProfileSchema = yup.object({
  fullName: yup
    .string()
    .trim()
    .required("Vui lòng nhập họ và tên.")
    .min(2, "Tên tối thiểu 2 ký tự."),
  birthDate: yup
    .string()
    .trim()
    .nullable()
    .matches(ISO_DATE_REGEX, "Ngày sinh phải theo định dạng YYYY-MM-DD.", {
      excludeEmptyString: true,
    }),
});

export default {
  login: loginSchema,
  register: registerSchema,
  completeProfile: completeProfileSchema,
};
