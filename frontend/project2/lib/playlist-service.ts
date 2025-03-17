import type { Playlist } from "@/types/playlist";

// 플레이리스트 생성
export async function createPlaylist(data: {
  title: string;
  description?: string;
  isPublic?: boolean;
}): Promise<Playlist> {
  const response = await fetch("http://52.78.27.224/api/v1/playlists", {
    cache: "no-store",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error("플레이리스트 데이터를 불러오지 못했습니다.");
  }
  const result = await response.json();
  return result.data;
}

// 플레이리스트 가져오기 함수 수정
export async function getPlaylistById(id: number): Promise<Playlist> {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";

  const response = await fetch(`http://52.78.27.224/api/v1/playlists/${id}`, {
    cache: "no-store",
    ...(isLoggedIn ? { credentials: "include" } : {}),
  });

  if (!response.ok) {
    throw new Error("플레이리스트 데이터를 불러오지 못했습니다.");
  }

  const result = await response.json();
  return result.data;
}

export async function updatePlaylist(
  id: number,
  data: {
    title?: string;
    description?: string;
    isPublic?: boolean;
  }
): Promise<Playlist> {
  const response = await fetch(`http://52.78.27.224/api/v1/playlists/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("플레이리스트 수정에 실패했습니다.");
  }

  const result = await response.json();
  return result.data;
}

// 플레이리스트 아이템 추가
export async function addItemToPlaylist(
  playlistId: number,
  item: {
    title: string;
    url: string;
    description?: string;
  }
): Promise<Playlist> {
  const response = await fetch(
    `http://52.78.27.224/api/v1/playlists/${playlistId}/items/link`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(item),
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("플레이리스트에 아이템 추가에 실패했습니다.");
  }

  const result = await response.json();

  // 업데이트된 플레이리스트 데이터 가져오기
  const updatedPlaylist = await getPlaylistById(playlistId);
  return updatedPlaylist;
}

// 플레이리스트 아이템 삭제 함수 수정 - URL 구성 방식 변경 및 로깅 추가
export async function deletePlaylistItem(
  playlistId: number,
  itemId: number,
  deleteChildren = true // 기본값으로 하위 아이템도 함께 삭제
): Promise<void> {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    throw new Error("로그인이 필요합니다.");
  }

  // 쿼리 파라미터로 하위 아이템 삭제 여부 전달
  // URL 구성 방식 변경 및 로깅 추가
  const url = `http://52.78.27.224/api/v1/playlists/${playlistId}/items/${itemId}?deleteChildren=${deleteChildren}`;
  console.log(
    `아이템 삭제 요청 URL: ${url}, deleteChildren: ${deleteChildren}`
  );

  try {
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(`아이템 삭제 실패 (${response.status}): ${errorText}`);
      throw new Error(
        `플레이리스트 아이템 삭제에 실패했습니다. 상태: ${response.status}`
      );
    }

    console.log(
      `아이템 ${itemId} 삭제 성공 (하위 아이템 삭제: ${deleteChildren})`
    );
  } catch (error) {
    console.error("아이템 삭제 중 오류 발생:", error);
    throw error;
  }
}

// 플레이리스트 아이템 편집 함수 추가
export async function updatePlaylistItem(
  playlistId: number,
  itemId: number,
  data: {
    title?: string;
    url?: string;
    description?: string;
  }
): Promise<Playlist> {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  if (!isLoggedIn) {
    throw new Error("로그인이 필요합니다.");
  }

  const response = await fetch(
    `http://52.78.27.224/api/v1/playlists/${playlistId}/items/${itemId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error("플레이리스트 아이템 수정에 실패했습니다.");
  }

  const result = await response.json();
  return result.data;
}

// 플레이리스트 아이템 순서 변경 함수 수정
export async function updatePlaylistItemOrder(
  playlistId: number,
  orderUpdates: { id: number; children?: number[] }[]
): Promise<Playlist> {
  console.log("서버에 전송할 순서 업데이트:", orderUpdates);

  try {
    const response = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/items/order`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        credentials: "include",
        body: JSON.stringify(orderUpdates),
      }
    );

    if (!response.ok) {
      throw new Error("플레이리스트 아이템 순서 변경에 실패했습니다.");
    }

    const result = await response.json();
    console.log("서버 응답 (순서 변경):", result);

    // 응답에서 아이템 목록의 displayOrder 값 확인
    if (result.data && result.data.items) {
      // 서버에서 받은 아이템을 displayOrder로 정렬하여 로깅
      const sortedItems = [...result.data.items].sort(
        (a: any, b: any) => a.displayOrder - b.displayOrder
      );
      console.log(
        "서버 응답에서 받은 아이템 displayOrder 정렬 순서:",
        sortedItems.map((item: any) => ({
          id: item.id,
          title: item.title,
          displayOrder: item.displayOrder,
        }))
      );

      // 정렬된 아이템으로 결과 반환
      return {
        ...result.data,
        items: sortedItems,
      };
    }

    return result.data;
  } catch (error) {
    console.error("순서 변경 API 호출 오류:", error);
    throw error;
  }
}

// 추천 플레이리스트 가져오기
export async function recommendPlaylist(
  playlistId: number,
  sortType = "combined"
): Promise<Playlist[]> {
  try {
    const response = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/recommendation?sortType=${sortType}`,
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("추천 플레이리스트 조회에 실패했습니다.");
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("추천 플레이리스트 조회 오류:", error);
    return [];
  }
}

// 모든 플레이리스트 가져오기
export async function getAllPlaylists(): Promise<Playlist[]> {
  try {
    const response = await fetch("http://52.78.27.224/api/v1/playlists", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("플레이리스트 목록 조회에 실패했습니다.");
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("플레이리스트 목록 조회 오류:", error);
    return [];
  }
}

// 좋아요한 플레이리스트 목록 가져오기
export async function getLikedPlaylists(): Promise<Playlist[]> {
  try {
    const response = await fetch("http://52.78.27.224/api/v1/playlists/liked", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("좋아요한 플레이리스트를 불러오지 못했습니다.");
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("좋아요한 플레이리스트 조회 오류:", error);
    throw error;
  }
}

// 플레이리스트 좋아요 수 가져오기 함수 수정 - 오류 처리 개선
export async function getPlaylistLikeCount(
  playlistId: number
): Promise<number> {
  try {
    // 캐시 방지를 위한 타임스탬프 추가
    const timestamp = new Date().getTime();
    const response = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/like/count?_t=${timestamp}`,
      {
        cache: "no-store",
        credentials: "include", // credentials 추가 - 중요!
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    if (!response.ok) {
      console.error(
        `좋아요 수 API 응답 오류: ${response.status} ${response.statusText}`
      );
      return 0; // 오류 시 0 반환
    }

    const data = await response.json();
    return data.data || 0; // null/undefined 체크
  } catch (error) {
    console.error("좋아요 수 가져오기 오류:", error);
    return 0; // 오류 시 0 반환
  }
}

// getPlaylistLikeStatus 함수 수정 - 캐시 관련 문제 해결
export async function getPlaylistLikeStatus(
  playlistId: number
): Promise<boolean> {
  try {
    // 로그인 상태 확인
    const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
      console.log("로그인 상태 아님: 좋아요 상태 false 반환");
      return false;
    }

    // 캐시 방지를 위한 타임스탬프 추가
    const timestamp = new Date().getTime();
    const response = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/like/status?_t=${timestamp}`,
      {
        credentials: "include",
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    if (!response.ok) {
      // 401 오류는 로그인이 필요한 경우이므로 false 반환
      if (response.status === 401) {
        console.log("좋아요 상태 확인: 로그인 필요 (401)");
        return false;
      }
      console.error(
        `좋아요 상태 API 응답 오류: ${response.status} ${response.statusText}`
      );
      throw new Error("좋아요 상태 확인 실패");
    }

    const data = await response.json();
    const likeStatus = Boolean(data.data);
    console.log(`API에서 가져온 좋아요 상태: ${likeStatus}`);

    return likeStatus;
  } catch (error) {
    console.error("좋아요 상태 확인 오류:", error);
    return false; // 오류 발생 시 기본값으로 false 반환
  }
}

// 플레이리스트 좋아요 추가 함수 수정 - 캐시 방지 강화
export async function likePlaylist(playlistId: number): Promise<void> {
  try {
    const response = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/like`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "좋아요 추가 실패");
    }

    // 좋아요 추가 성공 시 세션 스토리지 업데이트
    sessionStorage.setItem(`playlist_like_${playlistId}`, "true");
    console.log(
      `좋아요 추가 성공: 세션 스토리지 업데이트 (playlist_like_${playlistId} = true)`
    );
  } catch (error) {
    console.error("좋아요 추가 오류:", error);
    throw error;
  }
}

// 플레이리스트 좋아요 취소 함수 수정 - 캐시 방지 강화
export async function unlikePlaylist(playlistId: number): Promise<void> {
  try {
    const response = await fetch(
      `http://52.78.27.224/api/v1/playlists/${playlistId}/like`,
      {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "좋아요 취소 실패");
    }

    // 좋아요 취소 성공 시 세션 스토리지 업데이트
    sessionStorage.setItem(`playlist_like_${playlistId}`, "false");
    console.log(
      `좋아요 취소 성공: 세션 스토리지 업데이트 (playlist_like_${playlistId} = false)`
    );
  } catch (error) {
    console.error("좋아요 취소 오류:", error);
    throw error;
  }
}

// 로그인 상태 확인
export async function checkLoginStatus(): Promise<boolean> {
  // 세션 스토리지에서 로그인 상태 확인
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  return isLoggedIn;
}
