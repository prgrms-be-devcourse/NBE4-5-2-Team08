export async function checkLoginStatus(): Promise<boolean> {
  try {
    // 세션 스토리지에서 로그인 상태 확인
    const savedLoginStatus = sessionStorage.getItem("isLoggedIn");

    if (savedLoginStatus === "true") {
      return true;
    }

    const response = await fetch("http://52.78.27.224/api/v1/members/me", {
      credentials: "include",
    });

    if (response.ok) {
      sessionStorage.setItem("isLoggedIn", "true");
      return true;
    } else {
      sessionStorage.removeItem("isLoggedIn");
      return false;
    }
  } catch (error) {
    console.error("로그인 상태 확인 오류:", error);
    sessionStorage.removeItem("isLoggedIn");
    return false;
  }
}
