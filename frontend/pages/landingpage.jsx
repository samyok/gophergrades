import React from 'react'
import {Box, Input, InputGroup, InputLeftElement, VStack} from "@chakra-ui/react";
import {Search2Icon} from "@chakra-ui/icons";

const Home = () => {
    return (
        <div>

            <InputGroup style={
                {
                    position: "fixed",
                    bottom: "50%",
                    left: "10%",
                    width: "30%",

                }
            }>
                <InputLeftElement
                    pointerEvents='none'
                    children={<Search2Icon color='black' />}
                />
                <Input type='text' placeholder='Seach by Class Code, Instructor, or Department' style={{
                    boxShadow: "0px 0px 20px rgba(111, 19, 29, 0.2)",
                    borderRadius: "9px",
                    border: "none",

                }} />
            </InputGroup>

            <div style = {{
                width: "1200px",
                height: "600px",
                position: "fixed",
                left: "-550px",
                top: "-200px",
                background: "radial-gradient(41.96% 59.58% at 44.33% 30.65%, rgba(111, 19, 29, 0.45) 0%, rgba(111, 19, 29, 0) 100%)",
            }}>
            </div>
            <div style = {{
                width: "1200px",
                height: "600px",
                position: "fixed",
                left: "-700px",
                bottom: "-250px",
                background: "radial-gradient(41.96% 59.58% at 60.65% 44.93%, rgba(196, 160, 36, 0.4) 0%, rgba(182, 126, 42, 0) 75%)",

            }}
            ></div>
            <VStack>
                <Box>
                    <h1 style = {{
                        position: "fixed",
                        top: "15%",
                        left: "10%",
                        color: "rgb(91 0 19)",
                        fontSize: "100px",
                        fontWeight: "bold",

                    }}>
                        Gopher Grades</h1>
                </Box>
                <Box>
                    <h2 style = {{
                        position: "fixed",
                        left: "10%",
                        top: "35%",
                        color: "black",

                    }}
                    >View all the past grades for classes taken at the University of Minnesota</h2>
                </Box>
            </VStack>
            <div>
                <img src={"images/Goldy.png"} width={"650px"} height={"650px"} style={{
                    position: "fixed",
                    right: "10%",
                    bottom: "20%",

                }}/>
            </div>
        </div>


    );
}

export default Home;