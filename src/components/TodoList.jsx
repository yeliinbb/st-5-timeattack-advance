import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { todoApi } from "../api/todos";

export default function TodoList() {
  const navigate = useNavigate();
  const {
    data: todos,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const response = await todoApi.get("/todos");
      return response.data;
    },
  });

  // TODO: 아래 handleLike 로 구현되어 있는 부분을 useMutation 으로 리팩터링 해보세요. 모든 기능은 동일하게 동작해야 합니다.
  const queryClient = useQueryClient();
  // const handleLike = async (id, currentLiked) => {
  //   const previousTodos = [...todos];
  //   try {
  //     queryClient.setQueryData(["todos"], (prev) =>
  //       prev.map((todo) =>
  //         todo.id === id ? { ...todo, liked: !todo.liked } : todo,
  //       ),
  //     );
  //     await todoApi.patch(`/todos/${id}`, {
  //       liked: !currentLiked,
  //     });
  //   } catch (err) {
  //     console.error(err);
  //     queryClient.setQueryData(["todos"], previousTodos);
  //   } finally {
  //     refetch();
  //   }
  // };

  const { mutate: handleLike } = useMutation({
    mutationFn: async ({ id, currentLiked }) =>
      // 상태 업데이트
      await todoApi.patch(`/todos/${id}`, { liked: !currentLiked }),
    // onMutate는 서버 요청이 시작되기 전에 호출됨.
    onMutate: async ({ id, currentLiked }) => {
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      const previousTodos = queryClient.getQueryData(["todos"]);
      console.log("previousTodos => ", previousTodos);
      // 로컬 데이터 즉시 업데이트 (낙관적 업데이트)
      queryClient.setQueryData(["todos"], (prev) =>
        prev.map((todo) =>
          todo.id === id ? { ...todo, liked: !currentLiked } : todo
        )
      );
      // 이전 데이터를 반환하여 나중에 사용할 수 있도록 context로 전달
      return { previousTodos };
    },
    onError: (error, _, context) => {
      // 반환된 값 context로 오류 발생 시 이전 데이터로 롤백
      queryClient.setQueryData(["todos"], context.previousTodos);
      console.log(error);
    },
    onSettled: () => {
      // 변이가 완료되면 "todos" 쿼리 무효화
      queryClient.invalidateQueries(["todos"]);
    },
  });

  // useMutation({
  //   mutationFn: handleLike,
  //   onMutate: async ({ id, currentLiked }) => {
  //     await queryClient.cancelQueries({ queryKey: ["todos", id] });
  //     const previousTodos = queryClient.getQueriesData(["todos", id]);
  //     queryClient.setQueryData(["todos", id], currentLiked);
  //     return { previousTodos, currentLiked };
  //   },
  // });

  if (isPending) {
    return <div style={{ fontSize: 36 }}>로딩중...</div>;
  }

  if (error) {
    console.error(error);
    return (
      <div style={{ fontSize: 24 }}>에러가 발생했습니다: {error.message}</div>
    );
  }

  return (
    <ul style={{ listStyle: "none", width: 250 }}>
      {todos.map((todo) => (
        <li
          key={todo.id}
          style={{
            border: "1px solid black",
            padding: "10px",
            marginBottom: "10px",
          }}
        >
          <h3>{todo.title}</h3>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <button onClick={() => navigate(`/detail/${todo.id}`)}>
              내용보기
            </button>
            {todo.liked ? (
              <FaHeart
                onClick={() =>
                  handleLike({ id: todo.id, currentLiked: todo.liked })
                }
                style={{ cursor: "pointer" }}
              />
            ) : (
              <FaRegHeart
                onClick={() =>
                  handleLike({ id: todo.id, currentLiked: todo.liked })
                }
                style={{ cursor: "pointer" }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
