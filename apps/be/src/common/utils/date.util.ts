export class DateUtil {
  /** 한국 표준시를 기준으로 날짜(YYYY-MM-DD)를 반환하는 함수 */
  static getKstDateString(date: Date = new Date()): string {
    const kstOffset = 9 * 60 * 60 * 1000;
    return new Date(date.getTime() + kstOffset).toISOString().substring(0, 10);
  }

  /** 한국 표준시를 기준으로 어제 날짜(YYYY-MM-DD)를 반환하는 함수 */
  static getYesterdayKstDateString(date: Date = new Date()): string {
    const kstOffset = 9 * 60 * 60 * 1000;
    const todayKst = new Date(date.getTime() + kstOffset);
    todayKst.setDate(todayKst.getDate() - 1);
    return todayKst.toISOString().substring(0, 10);
  }
}
