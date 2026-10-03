import { HttpErrorResponse } from '@angular/common/http';
const errorTranslations: Record<string, string> = {
  'Invalid membership': 'ข้อมูลสมาชิกโปรเจกต์ไม่ถูกต้อง',
  'Duplicate project membership': 'มีโปรเจกต์ซ้ำในรายการสมาชิก',
  'Password change required': 'กรุณาเปลี่ยนรหัสผ่านก่อนดำเนินการต่อ',
  'Administrator access required': 'เฉพาะผู้ดูแลระบบเท่านั้นที่เข้าใช้งานส่วนนี้ได้',
  'User not found': 'ไม่พบบัญชีผู้ใช้งาน',
  'Too many login attempts': 'เข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่',
  'New password must be 12 to 128 characters': 'รหัสผ่านใหม่ต้องมี 12–128 ตัวอักษร',
  'Current password is incorrect': 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
  'New password must be different': 'รหัสผ่านใหม่ต้องต่างจากรหัสผ่านปัจจุบัน',
  'Project access denied': 'คุณไม่มีสิทธิ์เข้าถึงโปรเจกต์นี้',
  'Invalid username': 'รูปแบบชื่อผู้ใช้ไม่ถูกต้อง',
  'Invalid name': 'ชื่อที่แสดงไม่ถูกต้อง',
  'Password must be 12 to 128 characters': 'รหัสผ่านต้องมี 12–128 ตัวอักษร',
  'Username already exists': 'ชื่อผู้ใช้นี้มีอยู่แล้ว',
  'Invalid user': 'ข้อมูลผู้ใช้งานไม่ถูกต้อง',
  'You cannot disable or demote yourself': 'ไม่สามารถปิดใช้งานหรือลดสิทธิ์บัญชีของตนเองได้',
  'At least one active administrator is required': 'ระบบต้องมีผู้ดูแลที่เปิดใช้งานอย่างน้อยหนึ่งคน',
  'Use your own password page': 'กรุณาใช้หน้าเปลี่ยนรหัสผ่านของบัญชีตนเอง',
  'Unknown role': 'ไม่พบบทบาทที่เลือก',
  'Unknown permission': 'ไม่พบสิทธิ์ที่เลือก',
  'memberships must be an array': 'รูปแบบรายการสมาชิกโปรเจกต์ไม่ถูกต้อง',
};

export function apiErrorMessage(error: unknown, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่'): string {
  if (!(error instanceof HttpErrorResponse)) return fallback;
  const message = error.error?.message;
  if (Array.isArray(message)) return message.map(translateError).join(' ');
  return typeof message === 'string' && message.trim() ? translateError(message) : fallback;
}

function translateError(message: string): string {
  return errorTranslations[message] ?? message;
}
